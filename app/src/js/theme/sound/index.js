// webpack, loaded as chunk url
import switchOn from "./switch_on.mp3";
import switchOff from "./switch_off.mp3";
import click from "./click.mp3";



let context;

class Sound {
  constructor(url) {
    const snd = this;
    snd.buffer = null;
    snd.url = url;
  }

  async load() {
    const snd = this;
    const response = await fetch(snd.url);
    if (!response.ok) {
      throw new Error("File not found " + snd.url);
    }
    const arrayBuffer = await response.arrayBuffer();
    
    if (!context) {
      context = new AudioContext();
    }

    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    snd.buffer = audioBuffer;
  }

  async play() {
    const snd = this;
    if (!snd.buffer) {
      await snd.load();
    }

    const sourceNode = context.createBufferSource();
    sourceNode.buffer = snd.buffer;
    sourceNode.connect(context.destination);
    sourceNode.start();
  }
}

export const sounds = {
  click: new Sound(click),
  switch_on: new Sound(switchOn),
  switch_off: new Sound(switchOff),
};


