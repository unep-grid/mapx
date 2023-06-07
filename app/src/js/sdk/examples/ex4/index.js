class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      projectId: "Loading...",
      views: [],
      maxp: null,
    };
    this.getMapx = () => this.state.mapx;
  }

  componentDidMount() {
    const mapx = new mxsdk.Manager({
      container: this.mxContainer,
      verbose: true,
      url: {
        host: "dev.mapx.localhost",
        port: 8880,
      },
      params: {
        closePanels: true,
        language: "en",
      },
    });

    mapx.on("ready", () => {
      // Set state
      Promise.all([mapx.ask("get_project"), mapx.ask("get_views")]).then(
        (values) => {
          this.setState({
            projectId: values[0],
            views: values[1],
            mapx: mapx,
          });
        }
      );
    });
  }
  render() {
    return (
      <div className="container">
        <div className="pane-left item">
          <MxViewsCollections
            getMapx={this.getMapx}
            projectId={this.state.projectId}
            views={this.state.views}
          />
        </div>
        <div
          className="pane-right item"
          ref={(el) => (this.mxContainer = el)}
        />
      </div>
    );
  }
}
class MxViewsCollections extends React.Component {
  render() {
    var no_collection_name = "Views in no collection";
    var collections = {};
    collections[no_collection_name] = [];
    this.props.views.forEach((view) => {
      var view_collections = [];
      if ("collections" in view.data && Array.isArray(view.data.collections)) {
        view_collections = view.data.collections;
      }
      if (view_collections.length) {
        view_collections.forEach((view_collection) => {
          if (collections[view_collection] === undefined) {
            collections[view_collection] = [];
          }
          collections[view_collection].push(view);
        });
      } else {
        collections[no_collection_name].push(view);
      }
    });
    return (
      <div className="views-collections" id="actions">
        <h2>Collection(s)</h2>
        <p>Collection(s) for project: {this.props.projectId}</p>
        {Object.keys(collections).map((collection, i) => {
          return (
            <MxViewsCollection
              getMapx={this.props.getMapx}
              collection={collection}
              views={collections[collection]}
              key={i}
            />
          );
        })}
      </div>
    );
  }
}
class MxViewsCollection extends React.Component {
  render() {
    var out = <span>: No views</span>;
    if (this.props.views.length) {
      out = (
        <ul>
          {this.props.views.map((view, i) => {
            return (
              <li key={i}>
                <MxView getMapx={this.props.getMapx} view={view} key={i} />
              </li>
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
    );
  }
}
class MxView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      active: false,
    };
  }
  render() {
    var view = this.props.view;
    const mapx = this.props.getMapx();
    return (
      <a
        href="#"
        className={this.state.active ? "active" : null}
        onClick={() => {
          var op = !this.state.active ? "view_add" : "view_remove";
          mapx
            .ask(op, {
              idView: view.id,
            })
            .then(() => {
              this.setState({ active: !this.state.active });
            });
        }}
      >
        {view.data.title.en}
      </a>
    );
  }
}
ReactDOM.render(<App />, document.getElementById("app"));
