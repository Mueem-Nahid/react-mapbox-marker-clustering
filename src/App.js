import './App.css';
import { useRef, useState } from 'react';
import ReactMapGL, { FlyToInterpolator, Marker } from 'react-map-gl';
import useSWR from 'swr';
import CustodyImg from '../src/images/custody.svg';
import useSupercluster from 'use-supercluster';

const fetcher = (...args) => fetch(...args)
  .then(response => response.json());

function App() {
  const [viewport, setViewport] = useState({
    latitude: 52.6376,
    longitude: -1.135171,
    width: "100vw",
    height: "90vh",
    zoom: 12
  });

  const url = "https://data.police.uk/api/crimes-street/all-crime?lat=52.629729&lng=-1.131592&date=2021-01";

  const mapRef = useRef();
  // REACT_APP_MAPBOX_TOKEN=pk.eyJ1IjoibXVlZW0tbmFoaWQiLCJhIjoiY2t5bW02YnUwMjY0ZzJvcDl2N3RjcWU4NiJ9.h4MTLegLd8wHLI2qSaQjkw

  const { data, error } = useSWR(url, fetcher);

  const crimes = data && !error ? data : [];

  // GeoJSON Feature objects
  const points = crimes.map(crime => ({
    type: "Feature",
    properties: {
      cluster: false,
      crimeId: crime.id,
      category: crime.category
    },
    geometry: { type: "Point", coordinates: [parseFloat(crime.location.longitude), parseFloat(crime.location.latitude)] }
  }))

  // get map bounds
  const bounds = mapRef.current ? mapRef.current.getMap().getBounds().toArray().flat() : null
  console.log("bounds: ", bounds)

  // get clusters
  const { clusters, supercluster } = useSupercluster({
    points,
    zoom: viewport.zoom,
    bounds,
    options: { radious: 75, maxZoom: 20 }
  })
  console.log(clusters)

  return (
    <div className="App">
      <h1>Mapbox Marker Clustering</h1>
      <div>
        <ReactMapGL {...viewport} maxZoom={20} mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
          onViewportChange={(newViewport) => { setViewport({ ...newViewport }) }}
          ref={mapRef}
        >
          {clusters.map(cluster => {
            const [longitude, latitude] = cluster.geometry.coordinates;
            const { cluster: isCluster,
              point_count: pointCount } = cluster.properties;

            if (isCluster) {
              return (
                <Marker key={cluster.id} latitude={latitude} longitude={longitude}>
                  <div className='cluster-marker'
                    style={{
                      width: `${10 + (pointCount / points.length) * 60}px`,
                      height: `${10 + (pointCount / points.length) * 60}px`
                    }}
                    onClick={() => {
                      const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 20);
                      setViewport({
                        ...viewport,
                        latitude,
                        longitude,
                        zoom: expansionZoom,
                        transitionInterpolator: new FlyToInterpolator({speed: 2}),
                        transitionDuration: "auto"
                      })
                    }}
                  >
                    {pointCount}
                  </div>
                </Marker>
              )
            }

            return (<Marker key={cluster.properties.id} latitude={latitude} longitude={longitude}>
              <button className='crime-marker'>
                <img src={CustodyImg} alt="custody"></img>
              </button>
            </Marker>);
          })}
        </ReactMapGL>
      </div>
    </div>
  );
}

export default App;
