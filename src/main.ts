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
const modeButton = document.createElement("button");
modeButton.innerHTML = "Switch Move Mode";
document.body.append(modeButton);

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

const moveButtons: HTMLButtonElement[] = [
  northButton,
  eastButton,
  southButton,
  westButton,
];

//BUTTON CLICK HANDLERS
modeButton.addEventListener("click", () => {
  moveMode = !moveMode;
  moveButtons.forEach((button: HTMLButtonElement) => {
    button.disabled = !moveMode;
    button.hidden = !moveMode;
  });
});

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
const MAX_REACH = 70;
let moveMode: boolean = true;

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
let player_position = leaflet.latLng(
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
  UpdateCells();
  if (direction == "north") {
    player_position.lat += cell_north.lat;
    //console.log("Player position: " + player_position);
  } else if (direction == "east") {
    player_position.lng += cell_east.lng;
    //console.log("Player position: " + player_position);
  } else if (direction == "south") {
    player_position.lat -= cell_south.lat;
    //console.log("Player position: " + player_position);
  } else if (direction == "west") {
    player_position.lng -= cell_west.lng;
    //console.log("Player position: " + player_position);
  } else {
    console.log("No valid direction");
  }
  playerMarker.setLatLng(player_position);
  map.panTo(player_position);
}

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const modifiedCells = new Map<string, number>();

class Cell {
  i: number;
  j: number;
  pointValue: number;
  rect: leaflet.Rectangle;
  marker: leaflet.Marker;
  bounds: leaflet.LatLngBounds;

  constructor(
    i: number,
    j: number,
    pointValue: number,
    bounds: leaflet.LatLngBounds,
  ) {
    this.i = i;
    this.j = j;
    this.bounds = bounds;
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
    console.log("deleteCell");
    this.rect.removeFrom(map);
    this.marker.removeFrom(map);
  }

  createClickHandler() {
    this.rect.addEventListener("click", () => {
      if (this.withinRange()) {
        if (playerPoints == this.pointValue) {
          changePlayerPointsTo(0);
          this.changeValue(this.pointValue * 2);
        } else if (playerPoints == 0) {
          changePlayerPointsTo(this.pointValue);
          this.changeValue(0);
        } else if (this.pointValue == 0) {
          this.changeValue(playerPoints);
          changePlayerPointsTo(0);
        }
      }
    });
  }

  withinRange(): boolean {
    return (this.bounds.getCenter().distanceTo(player_position) < MAX_REACH);
  }

  changeValue(newValue: number) {
    const newIcon = leaflet.divIcon({
      className: "cache-icon",
      html: newValue.toString(),
      iconSize: [30, 30],
    });
    this.marker.setIcon(newIcon);
    this.pointValue = newValue;
    modifiedCells.set(`${this.i} ${this.j}`, this.pointValue);
  }
}

const cells: Cell[] = [];

function createCell(i: number, j: number) {
  const lat: number = i * TILE_DEGREES;
  const lng: number = j * TILE_DEGREES;
  const bounds = leaflet.latLngBounds([
    [lat, lng],
    [lat + TILE_DEGREES, lng + TILE_DEGREES],
  ]);
  let pointValue = 0;
  if (modifiedCells.has(`${i} ${j}`)) {
    pointValue = modifiedCells.get(`${i} ${j}`)!;
  } else {
    pointValue = Math.floor(
      luck(
            [i, j, "initialValue"]
              .toString(),
          ) * 3 + 1,
    );
    pointValue = Math.pow(2, pointValue);
  }
  const newCell: Cell = new Cell(
    i,
    j,
    pointValue,
    bounds,
  );
  cells.push(newCell);
}

// Fill Map Initially
regenerateCells();

function UpdateCells() {
  console.log("Array Length" + cells.length);
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
  regenerateCells();
}

function DeleteAllCells() {
  cells.forEach((cell) => {
    cell.deleteCell();
  });
  cells.splice(0, cells.length);
}

function regenerateCells() {
  const mapBounds = map.getBounds();
  for (
    let i = Math.floor(mapBounds.getSouthWest().lat / TILE_DEGREES);
    i <= Math.floor(mapBounds.getNorthEast().lat / TILE_DEGREES) + 1;
    i++
  ) {
    console.log("i: " + i);
    for (
      let j = Math.floor(mapBounds.getSouthWest().lng / TILE_DEGREES);
      j <= Math.floor(mapBounds.getNorthEast().lng / TILE_DEGREES) + 1;
      j++
    ) {
      if (luck([i, j, "mapGeneration"].toString()) < CACHE_SPAWN_PROBABILITY) {
        createCell(i, j);
      }
    }
  }
}

let timer = 0;
let prevTimeStamp = -1;
function Timer(timeStamp: number) {
  if (prevTimeStamp == -1) {
    prevTimeStamp = timeStamp;
  }
  const deltaTime = (timeStamp - prevTimeStamp) / 1000;
  prevTimeStamp = timeStamp;
  timer += deltaTime;
  if (timer > 5) {
    timer = 0;
    getPlayerGeoLocation();
  }
  requestAnimationFrame(Timer);
}
requestAnimationFrame(Timer);

getPlayerGeoLocation();
function getPlayerGeoLocation() {
  if (moveMode) {
    return;
  }
  console.log("plocation grabbed");
  navigator.geolocation.getCurrentPosition(
    (position: GeolocationPosition) => {
      player_position = leaflet.latLng(
        position.coords.latitude,
        position.coords.longitude,
      );

      map.panTo(
        player_position,
      );
      playerMarker.setLatLng(player_position);
    },
  );
}
