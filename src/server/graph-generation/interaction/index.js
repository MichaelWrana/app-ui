const _ = require('lodash');
const pc = require('../../pathway-commons');
const logger = require('./../../logger');
const LRUCache = require('lru-cache');
const cache = require('../../cache');
const { PC_CACHE_MAX_SIZE } = require('../../../config');

const cytoscape = require('cytoscape');

function edgeType(type) {
  switch(type){
    case 'in-complex-with':
    case 'interacts-with':
      return 'Binding';
    case 'controls-phosphorylation-of':
      return 'Phosphorylation';
    case 'controls-expression-of':
      return 'Expression';
    default:
      return '';
  }
}

function rawGetInteractionGraphFromPC(interactionIDs){
  const geneIds = _.uniq(_.concat([], interactionIDs)); //convert sources to array

  const params = {
    cmd : 'graph',
    source : geneIds,
    pattern : ['controls-phosphorylation-of','in-complex-with','controls-expression-of', 'interacts-with'],
    kind : geneIds.length > 1 ? 'pathsbetween' : 'neighborhood',
    format : 'txt'
  };

  //Fetch graph from PC
  return pc.query(params).then(res => {

    let network = parse(res,geneIds);
    let networkWithMetric = addMetric(network);
    let filteredNetwork = filterNetwork(networkWithMetric);

    return {network: filteredNetwork};
  }).catch((e)=>{
    logger.error(e);
    return 'ERROR : could not retrieve graph from PC';
  });
}

const pcCache = LRUCache({ max: PC_CACHE_MAX_SIZE, length: () => 1 });

const getInteractionGraphFromPC = cache(rawGetInteractionGraphFromPC, pcCache);

/**
 * Parse txt format to Json
 * @param {string} data graph in txt format
 * @param {String[]} Array of query Ids
 * @return {json} JSON of graph
 */
function parse(data, queryIds){
  let network = {
    edges:[],
    nodes:[],
  };
  let nodeMap=new Map(); //keeps track of nodes that have already been added
  if(data){
    const dataSplit=data.split('\n\n');
    const nodeMetadata= new Map(dataSplit[1].split('\n').slice(1).map(line =>line.split('\t')).map(line => [line[0], line.slice(1) ]));
    dataSplit[0].split('\n').slice(1).forEach(line => {
      const splitLine=line.split('\t');
      const edgeMetadata = interactionMetadata(splitLine[6],splitLine[4]);
      addInteraction([splitLine[0], splitLine[2]], splitLine[1], edgeMetadata, network, nodeMap, nodeMetadata, queryIds);
    });
    return network;
  }
  return {};
}

/**
 * 
 * @param {*} network A Javascript Object representing the nodes & edges in a network
 * @returns A graph where nodes can now be sorted by `metric`, most important nodes have largest value
 */
function addMetric(network) {

  //create dummy cytoscape object
  const cy = cytoscape({headless:true,container:undefined,elements:network});
  const nodes = cy.nodes();
  const bc = cy.$().bc();

  //calculate betweenness centrality value for each node, store it as `metric`
  nodes.forEach( node => {
    let bcVal = bc.betweenness(node);
    node.data('metric', bcVal);
  });

  return network;    
}

/**
 * @param {*} network A network containing a metric to sort nodes
 * @returns A network only containing the 50 nodes with the largest `metric` value
 */
function filterNetwork(network){
  //get list of nodes & edges
  const nodes = network.nodes;
  const edges = network.edges;

  //sort by `metric`
  let sortedNodes = nodes.sort( (a,b) => {
    return b.metric - a.metric; 
  });
  //get the 50 nodes with largest `metric`
  let filteredNodes = sortedNodes.slice(0,50);


  let filteredEdges = [];
  //for each edge, get the source and target
  edges.forEach( edge => {
    const source = edge.source;
    const target = edge.target;
    let sourceFound = false;
    let targetFound = false;

    //if there is a filtered node that matches the source and target of the edge,
    filteredNodes.forEach( node => {
      if(source === node.id)
        sourceFound = true;
      if(target === node.id)
        targetFound = true;
    });

    //add it to the list of filtered edges
    if(sourceFound && targetFound)
      filteredEdges.push(edge);

  });

  return { edges:filteredEdges, nodes:filteredNodes};
}


function interactionMetadata(mediatorIds, pubmedIds){
  let metadata = [['List',[]],['Detailed Views',[]]];//Format expected by format-content
  mediatorIds.split(';').forEach( link => {
    const id=link.split('/')[4];
    metadata[1][1].push(link.includes('reactome') ? ['Reactome',id]:['Pathway Commons',id]);
  });
  if(pubmedIds){
   pubmedIds.split(';').forEach(id=>metadata[0][1].push(['PubMed',id]));
  }
 return metadata;
}

function addInteraction(nodes, edge, sources, network, nodeMap, nodeMetadata, interactionIDs){
  const interaction= edgeType(edge);
  nodes.forEach((node)=>{
    if(!nodeMap.has(node)){
      const metadata=nodeMetadata.get(node);
      nodeMap.set(node,true);
      const links=_.uniqWith(_.flatten(metadata.slice(-2).map(entry => entry.split(';').map(entry=>entry.split(':')))),_.isEqual).filter(entry=>entry[0]!='intact');

      network.nodes.push({data:{
        class: "ball",
        id: node,
        label: node,
        queried: interactionIDs.indexOf(node) != -1,
        parsedMetadata:[
          ['Type',
          'bp:'+metadata[0].split(' ')[0].replace(/Reference/g,'').replace(/;/g,',')],
          ['Database IDs', links]
        ]
      }});
    }
  });

  network.edges.push({data: {
    id: nodes[0]+'\t'+edge+'\t'+nodes[1] ,
    label: nodes[0]+' '+edge.replace(/-/g,' ')+' '+nodes[1] ,
    source: nodes[0],
    target: nodes[1],
    class: interaction,
    parsedMetadata:sources
  },classes:interaction});
}

module.exports = {getInteractionGraphFromPC};