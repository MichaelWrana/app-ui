const React = require('react');
const h = require('react-hyperscript');
const classNames = require('classnames');
const Loader = require('react-loader');
const _ = require('lodash');

const IconButton = require('../icon-button');

const debouncedSearchNodes = _.debounce(require('../../cy/match-style'), 300);


// cytoscape
// grapjson
// metadata

// probably in the future
// buttons
// events
// sidebar menus

// state
// layout config
// activeMenu

class BaseNetworkView extends React.Component {
  constructor(props) {
    super(props);

    if( process.env.NODE_ENV !== 'production' ){
      props.cySrv.getPromise().then(cy => window.cy = cy);
    }

    this.state = _.merge({},
      {
        activeMenu: 'closeMenu',
        nodeSearchValue: '',
        open: false,
        networkLoading: true,
        updateBaseViewState: (nextState, next) => this.setState(nextState, next ? next() : null)
      }, props);
    this.state.open = this.state.activeMenu !== 'closeMenu';
  }

  componentWillReceiveProps(nextProps){//needed to updata metadata for interactions
    this.setState({
      networkMetadata: nextProps.networkMetadata,
      filters:nextProps.filters
    });
  }

  componentWillUnmount() {
    this.state.cySrv.destroy();
  }

  componentDidMount() {
    const state = this.state;
    const initialLayoutOpts = _.assign({}, state.layoutConfig.defaultLayout.options, {
      animate: false // no animations on init load
    });
    const container = this.graphDOM;

    const cySrv = state.cySrv;

    cySrv.mount(container);

    const cy = cySrv.get();

    cy.remove('*');

    cy.add(state.networkJSON);

    const layout = cy.layout(initialLayoutOpts);

    layout.on('layoutstop', () => {
      cySrv.load(); // indicate loaded
      this.setState({networkLoading: false});
    });

    layout.run();
  }


  changeMenu(menu) {
    let resizeCyImmediate = () => this.state.cySrv.get().resize();
    let resizeCyDebounced = _.debounce( resizeCyImmediate, 500 );

    if (menu === this.state.activeMenu || menu === 'closeMenu') {
      this.setState({
        activeMenu: 'closeMenu',
        open: false
      }, resizeCyImmediate);
    } else {
      this.setState({
        activeMenu: menu,
        open: true
      }, resizeCyDebounced);
    }
  }

  searchCyNodes(queryString) {
    debouncedSearchNodes(this.state.cySrv.get(), queryString);
  }

  clearSearchBox() {
    this.setState({
      nodeSearchValue: ''
    }, () => this.searchCyNodes(''));
  }


  render() {
    const state = Object.assign({}, this.state, {
      cy: this.state.cySrv.get()
    });

    const componentConfig = state.componentConfig;

    const toolbarButtons = componentConfig.toolbarButtons;
    const menus = state.componentConfig.menus;

    const activeMenu = menus.filter(menu => menu.id === state.activeMenu)[0].func(state);
    const menuWidth = menus.filter(menu => menu.id === state.activeMenu)[0].width;

    const menuButtons = toolbarButtons.filter(btn => btn.type === 'activateMenu').map(btn => {
      return (
        h('div.sidebar-tool-button-container', [
          h(IconButton, {
            key: btn.id,
            icon: btn.icon,
            active: state.activeMenu === btn.menuId,
            onClick: () => {
              this.changeMenu(btn.menuId);
            },
            desc: btn.description,
            cy: state.cySrv.get()
          })
        ])
      );
    });

    const networkButtons = toolbarButtons.filter(btn => btn.type === 'networkAction').map(btn => {
      return (
        h(IconButton, {
          key: btn.id,
          icon: btn.icon,
          onClick: () => {
            btn.func(state);
          },
          desc: btn.description,
          cy: state.cySrv.get()
        })
      );
    });

    const nodeSearchBarInput = h('div.view-search-bar', [
      h('input.view-search', {
        ref: dom => this.searchField = dom,
        value: this.state.nodeSearchValue,
        type: 'search',
        placeholder: 'Search entities',
      }),
      this.state.nodeSearchValue === '' ? null : h('div.view-search-clear', {onClick: () => this.clearSearchBox()}, [ // check if the search bar is empty
        h('i.material-icons', 'close')
      ])
    ]);


    const nodeSearchBar = [
      h('div', {
        className: classNames('search-nodes', { 'search-nodes-open': this.state.searchOpen }),
        onChange: e => {
          this.setState({
            nodeSearchValue: e.target.value
          });
          this.searchCyNodes(e.target.value);
        }
      }, [nodeSearchBarInput])
    ];

    const toolBar = [
      ...menuButtons,
      ...networkButtons,
      // ...(componentConfig.useLayoutDropdown ? layoutDropdown : []), // TODO re-add dropdown for edit
      ...(componentConfig.useSearchBar ? nodeSearchBar : [])
    ];

    //display pathway and database names
    const metadataTitles = h('h4',[
      h('span', state.networkMetadata.name),
      ' | ',
      h('a', state.networkMetadata.datasource)
    ]);

    // if 'titleContainer' exists from index file, unique title will render in 'div.title-container'
    // default: metadata pathway name and database
    const displayInfo = [
      (this.props.titleContainer ?  this.props.titleContainer() : metadataTitles)
    ];


    return h('div.view', [
      h('div', { className: classNames('menu-bar', { 'menu-bar-margin': state.activeMenu }) }, [
        h('div.menu-bar-inner-container', [
          h('div.pc-logo-container', [
            h('a', { href: 'http://www.pathwaycommons.org/' } , [
              h('img', {
                src: '/img/icon.png'
              })
            ])
          ]),
          h('div.title-container', displayInfo)
        ]),
        h('div.view-toolbar', {style: {display: this.props.closeToolBar == true ? 'none': 'inherit'}}, toolBar)
      ]),
      h(Loader, {
        loaded: !this.state.networkLoading,
        options: { left: '50%', color: '#16A085' },
      }),
      h('div.graph', {
          className: classNames({
            'graph-network-loading': this.state.networkLoading,
            'graph-sidebar-open': this.state.open
          }),
          style: { width: menuWidth?`${100-menuWidth}%`:'' }
        },
        [
          h('div.graph-cy', {
            ref: dom => this.graphDOM = dom,
          })
        ]
      ),
      h('div', {
        className: classNames('sidebar-menu',{'sidebar-menu-open': this.state.open }),
        style: { width: menuWidth?`${menuWidth}%`:'' }
      }, [
          h('div', {
            className: classNames('sidebar-close-button-container', { 'sidebar-close-button-container-open': this.state.open })
          }, [
              h(IconButton, {
                key: 'close',
                icon: 'close',
                onClick: () => this.changeMenu('closeMenu'),
                desc: 'Close the sidebar'
              })
            ]),
          h('div.sidebar-content', [
            h('div.sidebar-resize'),
            h('div.sidebar-text', [activeMenu])
          ])
        ])
    ]);
  }
}

module.exports = BaseNetworkView;
