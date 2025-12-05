// deno-lint-ignore-file no-unused-vars
// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

// Create basic UI elements

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

//STATUS PANEL
const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

//PLAYER POINTS
let playerPoints = 0;
statusPanelDiv.innerHTML = "No held token";

function changePlayerPointsTo(points: number) {
  playerPoints = points;
  if (playerPoints == 0) {
    statusPanelDiv.innerHTML = "No held token";
  } else {
    statusPanelDiv.innerHTML = "Current token: " + playerPoints;
  }
  if (playerPoints == 32) {
    statusPanelDiv.innerHTML = "Current token: " + playerPoints +
      ", Your token is of sufficient value! Rejoice!";
  }
}

const northButton = document.createElement("button");
northButton.innerHTML = "North";
document.body.append(northButton);

const eastButton = document.createElement("button");
eastButton.innerHTML = "East";
document.body.append(eastButton);

const southButton = document.createElement("button");
southButton.innerHTML = "South";
document.body.append(southButton);

const westButton = document.createElement("button");
westButton.innerHTML = "West";
document.body.append(westButton);

//BUTTON CLICK HANDLERS
northButton.addEventListener("click", () => {
  movePlayer("north");
});
eastButton.addEventListener("click", () => {
  movePlayer("east");
});
southButton.addEventListener("click", () => {
  movePlayer("south");
});
westButton.addEventListener("click", () => {
  movePlayer("west");
});

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

map.addEventListener("moveend", () => {
  UpdateCells();
});

//PLAYER
const player_position = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
); // the classroom for now
const playerMarker = leaflet.marker(player_position);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const cell_north = leaflet.latLng(
  0.000100000000000,
  0.000100000000000,
);
const cell_east = leaflet.latLng(
  0.000100000000000,
  0.000100000000000,
);
const cell_south = leaflet.latLng(
  0.000100000000000,
  0.000100000000000,
);
const cell_west = leaflet.latLng(
  0.000100000000000,
  0.000100000000000,
);

function movePlayer(direction: string) {
  if (direction == "north") {
    player_position.lat += cell_north.lat;
    console.log("Player position: " + player_position);
  } else if (direction == "east") {
    player_position.lng += cell_east.lng;
    console.log("Player position: " + player_position);
  } else if (direction == "south") {
    player_position.lat -= cell_south.lat;
    console.log("Player position: " + player_position);
  } else if (direction == "west") {
    player_position.lng -= cell_west.lng;
    console.log("Player position: " + player_position);
  } else {
    console.log("No valid direction");
  }
  playerMarker.setLatLng(player_position);
}

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

class Cell {
  i: number;
  j: number;
  pointValue: number;
  rect: leaflet.Rectangle;
  marker: leaflet.Marker;

  constructor(
    i: number,
    j: number,
    pointValue: number,
    bounds: leaflet.LatLngBounds,
  ) {
    this.i = i;
    this.j = j;
    this.pointValue = pointValue;
    this.rect = leaflet.rectangle(bounds, {
      color: "red",
    });
    this.rect.addTo(map);
    const myIcon = leaflet.divIcon({
      className: "cache-icon",
      html: pointValue.toString(),
      iconSize: [30, 30],
    });
    this.marker = leaflet.marker(bounds.getCenter(), {
      icon: myIcon,
      interactive: false,
    }).addTo(map);
    this.createClickHandler();
  }

  deleteCell() {
    this.rect.removeFrom(map);
    this.marker.removeFrom(map);
  }

  createClickHandler() {
    this.rect.addEventListener("click", () => {
      console.log("cache clicked");
      if (playerPoints == pointValue) {
        changePlayerPointsTo(0);
        pointValue = pointValue * 2;
        const newIcon = leaflet.divIcon({
          className: "cache-icon",
          html: pointValue.toString(),
          iconSize: [30, 30],
        });
        this.marker.setIcon(newIcon);
      }
    });
  }
}

const cells: Cell[] = [];

let pointValue: number = 0;

function createCell(lat: number, lng: number) {
  const i: number = lat;
  const j: number = lng;
  const bounds = leaflet.latLngBounds([
    [lat, lng],
    [lat + TILE_DEGREES, lng + TILE_DEGREES],
  ]);
  pointValue = Math.floor(
    luck(
      [bounds.getSouthWest().lat, bounds.getNorthEast().lng, "initialValue"]
        .toString(),
    ) * 2,
  );
  const newCell: Cell = new Cell(
    i,
    j,
    pointValue,
    bounds,
  );
  cells.push(newCell);
}

// Fill Map Initially
const mapBounds = map.getBounds();
let cache = false;
for (
  let i = mapBounds.getSouthWest().lat;
  i < mapBounds.getNorthEast().lat;
  i += TILE_DEGREES
) {
  for (
    let j = mapBounds.getSouthWest().lng;
    j < mapBounds.getNorthEast().lng;
    j += TILE_DEGREES
  ) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      createCell(i, j);
    }
    console.log("Array Length" + cells.length);
    cache = false;
  }
}

function UpdateCells() {
  const mapBounds = map.getBounds();
  const iLAT = mapBounds.getSouthWest().lat;
  const iLNG = mapBounds.getSouthWest().lng;
  const jLAT = mapBounds.getNorthEast().lat;
  const jLNG = mapBounds.getNorthEast().lng;
  const screenBounds = leaflet.latLngBounds([
    [iLAT, iLNG],
    [jLAT, jLNG],
  ]);
  DeleteAllCells();
}

function DeleteAllCells() {
  cells.forEach((cell) => {
  });
}
