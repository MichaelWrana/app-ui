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
    if(this.state.value === 0){
        for(let i in nodes){
            if(nodes[i].show)
                nodes[i].show();
        }
    }
    for(let i in nodes){
        if(nodes[i].show)
            nodes[i].show();
        else
            continue;
        if(nodes[i].degree() < this.state.value && nodes[i].parent().length < 1){
            nodes[i].hide();
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