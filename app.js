"use strict";

let map;
let overlay;
let timerId = null;
let startMs = 0;

let started = false;
let index = 0;
let correct = 0;

let guessMarker = null;
let answerRect = null;

const overlayBounds = {
  north: 34.2489,
  south: 34.2356,
  east: -118.5202,
  west: -118.5410
};

const LOCS = [
  {
    name: "Bookstore",
    bounds: { north: 34.24095, south: 34.24005, east: -118.52655, west: -118.52755 }
  },
  {
    name: "Bayramian Hall",
    bounds: { north: 34.24155, south: 34.24080, east: -118.53000, west: -118.53125 }
  },
  {
    name: "Jacaranda Hall",
    bounds: { north: 34.24120, south: 34.24035, east: -118.52905, west: -118.53020 }
  },
  {
    name: "Manzanita Hall",
    bounds: { north: 34.23780, south: 34.23685, east: -118.52870, west: -118.53010 }
  },
  {
    name: "Donald Bianchi Planetarium (E3)",
    bounds: { north: 34.23955, south: 34.23860, east: -118.52770, west: -118.52920 }
  }
];

window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 34.241, lng: -118.528 },
    zoom: 16.7,
    disableDefaultUI: true,
    draggable: false,
    keyboardShortcuts: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    gestureHandling: "none",
    styles: [
      { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "all", elementType: "geometry", stylers: [{ saturation: -100 }, { lightness: 30 }] }
    ]
  });

  overlay = new google.maps.GroundOverlay("csun_map.png", overlayBounds, { opacity: 0.95 });
  overlay.setMap(map);

  const b = new google.maps.LatLngBounds(
    { lat: overlayBounds.south, lng: overlayBounds.west },
    { lat: overlayBounds.north, lng: overlayBounds.east }
  );
  map.fitBounds(b);

  map.addListener("dblclick", (e) => {
    if (!started) return;
    handleGuess(e.latLng);
  });

  $("#startBtn").on("click", startGame);
  $("#resetBtn").on("click", resetGame);

  buildList();
  setProgress();
  setStatus("Press Start.");
};

function buildList() {
  const $list = $("#questionList");
  $list.empty();

  for (let i = 0; i < LOCS.length; i++) {
    const html = `
      <div class="item" data-i="${i}">
        <div class="qbar">Where is ${escapeHtml(LOCS[i].name)}?</div>
        <div class="msg" id="msg-${i}"></div>
      </div>
    `;
    $list.append(html);
  }
}

function startGame() {
  if (started) return;

  started = true;
  index = 0;
  correct = 0;

  cleanupMapStuff();
  clearMsgs();
  highlightActive();

  $("#finalBig").addClass("hidden").text("");
  $("#startBtn").prop("disabled", true);

  startMs = Date.now();
  if (timerId) clearInterval(timerId);
  timerId = setInterval(tick, 250);

  setProgress();
  setStatus("Double click the map to answer.");
}

function resetGame() {
  started = false;
  index = 0;
  correct = 0;

  if (timerId) clearInterval(timerId);
  timerId = null;

  $("#time").text("00:00");
  $("#startBtn").prop("disabled", false);

  cleanupMapStuff();
  clearMsgs();
  $(".qbar").removeClass("active");

  $("#finalBig").addClass("hidden").text("");
  setProgress();
  setStatus("Press Start.");
}

function handleGuess(latLng) {
  if (!started) return;

  const loc = LOCS[index];
  const rectBounds = new google.maps.LatLngBounds(
    { lat: loc.bounds.south, lng: loc.bounds.west },
    { lat: loc.bounds.north, lng: loc.bounds.east }
  );

  const ok = rectBounds.contains(latLng);

  cleanupMapStuff();

  guessMarker = new google.maps.Marker({
    position: latLng,
    map,
    title: "Your Guess"
  });

  answerRect = new google.maps.Rectangle({
    map,
    bounds: rectBounds,
    strokeColor: ok ? "#2f7d2f" : "#cc2d2d",
    fillColor: ok ? "#2f7d2f" : "#cc2d2d",
    fillOpacity: 0.35,
    strokeWeight: 2
  });

  if (ok) {
    $("#msg-" + index).removeClass("wrong").addClass("correct").text("Your answer is correct!!");
    correct++;
  } else {
    $("#msg-" + index).removeClass("correct").addClass("wrong").text("Sorry wrong location.");
  }

  index++;

  if (index >= LOCS.length) {
    finish();
    return;
  }

  highlightActive();
  setProgress();
}

function finish() {
  started = false;

  if (timerId) clearInterval(timerId);
  timerId = null;

  $(".qbar").removeClass("active");

  const wrong = LOCS.length - correct;
  $("#finalBig")
    .removeClass("hidden")
    .text(`${correct} Correct, ${wrong} Incorrect`);

  $("#startBtn").prop("disabled", false);
  setProgress();
  setStatus("Done.");
}

function highlightActive() {
  $(".qbar").removeClass("active");
  $(`.item[data-i="${index}"] .qbar`).addClass("active");
}

function clearMsgs() {
  for (let i = 0; i < LOCS.length; i++) {
    $("#msg-" + i).removeClass("correct wrong").text("");
  }
}

function cleanupMapStuff() {
  if (guessMarker) {
    guessMarker.setMap(null);
    guessMarker = null;
  }
  if (answerRect) {
    answerRect.setMap(null);
    answerRect = null;
  }
}

function tick() {
  const ms = Date.now() - startMs;
  $("#time").text(fmt(ms));
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

function setProgress() {
  $("#progress").text(`${Math.min(index, LOCS.length)}/${LOCS.length}`);
}

function setStatus(t) {
  $("#statusLine").text(t);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
