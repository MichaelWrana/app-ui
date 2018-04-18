const React = require('react');
const h = require('react-hyperscript');
const classNames = require('classnames');
const _ = require('lodash');

class InteractionsFilterMenu extends React.Component {
  render(){
    const props= this.props;
    const buttons= _.map(props.buttonsClicked,(clicked,type)=>
    h('div',{
        key:type,
        className:classNames ('interaction-filter-button', clicked? 'interaction-filter-clicked':'interaction-filter-not-clicked'),
        onClick: () => props.filterUpdate(type)
      },
      [
        h('div',{className:classNames('interaction-filter-legend',{[type]:!clicked})}),
        h('h3.button-label',type),
      ]
    ));
    return h('div',[
      h('h2', 'Interaction Filters'),
      buttons
    ]);
  }
}
module.exports = InteractionsFilterMenu; 