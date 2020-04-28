# Example 4

Group project's views by collections in the "host page" and toggle open/close in the "guest mapx application".

Use [ReactJs](https://en.reactjs.org/)...

![alt text](image_sc.gif "Logo Title Text 1")

```js
'use strict';

const mapx = new mxsdk.Manager({
  container: document.getElementById('mapx'),
  url: 'http://dev.mapx.localhost:8880/?project=MX-3ZK-82N-DY8-WU2-IGF&language=en',
  // url: 'https://app.mapx.org/?project=MX-2LD-FBB-58N-ROK-8RH&language=en',
});

class MxViewsCollections extends React.Component {
  render() {
    var no_collection_name = 'Views in no collection';
    var collections = {}; collections[no_collection_name] = [];
    this.props.views.forEach((view) => {
      var view_collections = [];
      if ('collections' in view.data && Array.isArray(view.data.collections)) {
        view_collections = view.data.collections;
      }
      if (view_collections.length) {
        view_collections.forEach((view_collection) => {
          if (collections[view_collection] === undefined) {
            collections[view_collection] = [];
          }
          collections[view_collection].push(view);
        });
      }
      else {
        collections[no_collection_name].push(view);
      }
    });

    return (
      <div className="views-collections" id="actions">
        <h2>Collection(s)</h2>
        <p>Collection(s) for project: {this.props.projectId}</p>
        {Object.keys(collections).map((collection, i) => {
          return (
            <MxViewsCollection collection={collection} views={collections[collection]} key={i} />
          )
        })}
      </div>
    );
  }
}

class MxViewsCollection extends React.Component {
  render() {
    var out = '<span>No views</span>';
    if (this.props.views.length) {
      out = (
        <ul>
          {this.props.views.map((view, i) => {
            return (
              <li key={i}><MxViews view={view} key={i} /></li>
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

class MxViews extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      active: false,
    }
  }
  render() {
    var view = this.props.view;
    return (
        <a
          href="#"
          className={this.state.active ? 'active': null}
          onClick={() => {
            var op = !this.state.active ? 'open_view' : 'close_view';
            mapx.ask(op, {
              idView: view.id
            });
            this.setState({active: !this.state.active});
          }}
        >
          {view.data.title.en}
        </a>
    );
  }
}

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
  ]).then(function(values) {
    ReactDOM.render(
      <MxViewsCollections projectId={values[0]} views={values[1]} />,
      document.getElementById('views-collections-container')
    );
  });
});
```



