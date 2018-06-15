const React = require('react');
const h = require('react-hyperscript');

class SelectionSliderMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        cy: props.cy,
        nodes: props.cy.nodes(),
        value:0,
    };
  }

  buttonClickFunc() {
    const nodes = this.state.nodes;
    let sliderVal = this.state.value;

    if(this.state.value === 0){
        for(let i in nodes){
            if(nodes[i].show)
                nodes[i].show();
        }
    }
    for(let i in nodes){
        //Get data needed to make decision about whether to hide or show the node
        let node = nodes[i];
        let nodeType = null;
        let parent = null;
        let parentType = null;
        if(node.parent){parent = node.parent();}
        if(node.data){nodeType = node.data().class;}
        if(parent && parent.length > 0 && parent.data){parentType = parent.data().class;}

        //sometimes "nodes" are functions?? this fixes that
        if(node.show){ node.show(); }
        else{ continue; }


        //pretend compartments are not nodes in the graph when deciding whether to hide or show a node
        //pretend a complex is a single node, and anything inside counts as the complex
        if(nodeType !== "compartment"){
            if(parent.length > 0){
                if(parentType === "compartment" && node.degree() <= sliderVal){
                    node.hide();
                }
            }else{
                if(node.degree() <= sliderVal){
                    node.hide();
                }
            }
        }

    }
  }
  
  render() {
    return h('div.container',{},[
        h("input.selection-slider",{type:"range",min:"0",max:"4",value:this.state.value,onChange:(e) => this.setState({value:e.target.value})}),
        h('button.functionButton',{onClick:() => this.buttonClickFunc()},"Click Me!")
    ]);
  }
}

module.exports = SelectionSliderMenu;