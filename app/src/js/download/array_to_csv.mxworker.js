self.onmessage = function (e) {
  let csv = "";
  const data = e.data?.table;
  const keys = e.data?.keys || Object.keys(data[0]);

  csv += keys.join(",") + "\n";
  for (let i = 0; i < data.length; i++) {
    let rowString = "";
    for (let j = 0; j < keys.length; j++) {
      rowString += data[i][keys[j]] + ",";
    }
    csv += rowString.slice(0, -1) + "\n";
  }
  self.postMessage(csv);
};
