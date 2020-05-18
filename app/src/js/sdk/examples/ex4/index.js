'use strict';

// const mapxUrl = 'http://dev.mapx.localhost:8880/?project=MX-3ZK-82N-DY8-WU2-IGF&language=en';
const mapxUrl = 'https://app.mapx.org/?project=MX-2LD-FBB-58N-ROK-8RH&language=en';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      projectId: 'Loading...',
      views: [],
      maxp: null,
    };
    this.getMapx = () => this.state.mapx;
  }

  componentDidMount() {
    const mapx = new mxsdk.Manager({
      container: this.mxContainer,
      url: mapxUrl,
    });

    mapx.on('ready', () => {
      /**
       * Hide views panel
       */
      mapx.ask('set_panel_left_visibility', {
        panel: 'views',
        show: false,
      });

      Promise.all([
        mapx.ask('get_project'),
        mapx.ask('get_views'),
      ]).then((values) => {
        var views = values[1].reduce((out, view) => {
          out[view.id] = view;
          out[view.id]._active = false;
          return out;
        }, new Map());
        this.setState({
          projectId: values[0],
          views: views,
          mapx: mapx,
        });
        mapx.on('view_added',view => {
          views[view.idView]._active = true;
          this.setState({views: views});
        });
        mapx.on('view_closed',view => {
          views[view.idView]._active = false;
          this.setState({views: views});
        });
      });
    });
  }

  render() {
    return (
      <div className="container">
        <div className="pane-left item">
          <MxViewsCollections getMapx={this.getMapx} projectId={this.state.projectId} views={this.state.views} />
        </div>
        <div className="pane-right item" ref={el => this.mxContainer = el} />
      </div>
    )
  }
}

class MxViewsCollections extends React.Component {
  render() {
    var no_collection_name = 'Views in no collection';
    var collections = {}; collections[no_collection_name] = new Map();
    for (var id in this.props.views) {
      var view = this.props.views[id];
      var view_collections = [];
      if ('collections' in view.data && Array.isArray(view.data.collections)) {
        view_collections = view.data.collections;
      }
      if (view_collections.length) {
        view_collections.forEach((view_collection) => {
          if (collections[view_collection] === undefined) {
            collections[view_collection] = new Map();
          }
          collections[view_collection][id] = view;
        });
      }
      else {
        collections[no_collection_name][id] = view;
      }
    }

    return (
      <div className="views-collections" id="actions">
        <h2>Collection(s)</h2>
        <p>Collection(s) for project: {this.props.projectId}</p>
        {Object.keys(collections).map((collection, i) => {
          return (
            <MxViewsCollection getMapx={this.props.getMapx}collection={collection} views={collections[collection]} key={i} />
          )
        })}
      </div>
    );
  }
}

class MxViewsCollection extends React.Component {
  render() {
    var out = (<span>: No views</span>);
    if (Object.keys(this.props.views).length) {
      out = (
        <ul>
          {Object.entries(this.props.views).map(([id, view]) => {
            return (
              <li key={id}><MxView getMapx={this.props.getMapx} view={view} key={id} /></li>
            );
          })}
        </ul>
      );
    }
    return (
      <ul className="views-collection">
        <li>
          <span>{this.props.collection}</span>
          {out}
        </li>
      </ul>
    )
  }
}

class MxView extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var view = this.props.view;
    const mapx = this.props.getMapx();
    return (
        <a
          href="#"
          className={view._active ? 'active': null}
          onClick={() => {
            var op = !view._active ? 'open_view' : 'close_view';
            mapx.ask(op, {
              idView: view.id
            });
          }}
        >
          {view.data.title.en}
        </a>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
