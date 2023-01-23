import { stringify } from "csv";

self.onmessage = function (e) {
  const table = e.data?.table;
  const headers = e.data?.headers;

  stringify(
    table,
    {
      header: true,
      columns: headers,
    },
    (err, csv) => {
      if (err) {
        throw new Error(err);
      }
      self.postMessage(csv);
    }
  );
};
