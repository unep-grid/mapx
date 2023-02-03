import { getApiUrl } from "./../api_routes";

export async function fileFormats() {
  const url = getApiUrl("getFileFormatsList");
  const fileFormatsResp = await fetch(url);
  const fileFormats = await fileFormatsResp.json();
  return fileFormats;
}

export async function fileFormatsVector() {
  const formats = await fileFormats();
  return formats.filter((f) => (f.type = "vector"));
}
export async function fileFormatsVectorUpload() {
  const formats = await fileFormatsVector();
  return formats.filter((f) => !!f.upload);
}
export async function fileFormatsVectorDownload() {
  const formats = await fileFormatsVector();
  return formats.filter((f) => !!f.download);
}
