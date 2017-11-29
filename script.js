class Player {
  constructor() {
    this.el = document.getElementById('player-view');
    this.addEventListener = this.el.addEventListener.bind(this.el);

    this.queue = [];
    this.plyr = null;
  }

  async init() {
    const players = plyr.setup(this.el, {
      controls: ['play-large'],
      debug: true,
    });
    this.plyr = players[0];
    this.plyr.on('ended', () => this.playNext());
    await new Promise((resolve) => this.plyr.on('ready', resolve));

    this.plyr.on('ready', () => this.plyr.togglePlay(true));
    this.plyr.on('error', (e) => {
      console.error(e);
      this.playNext();
    });
  }

  play(video) {
    console.log('play', video);
    const {id, type, title} = video;
    this.plyr.source({
      type: 'video',
      title: title,
      sources: [{src: id, type}]
    });
    this.el.dispatchEvent(new CustomEvent('dequeue', { detail: video }));
  }

  enqueue(video) {
    // Do not enqueue the same video twice.
    const exists = this.queue.filter((v) => v.id == video.id).length > 0;
    const current = this.plyr.isReady() && (this.plyr.source().indexOf(video.id) > 0);
    if (exists || current) {
      return;
    }
    // Add to queue.
    this.queue.push(video);
    this.el.dispatchEvent(new CustomEvent('enqueue', { detail: video }));
    // If not playing, start!
    if (this.plyr.isPaused()) {
      this.playNext();
    }
  }

  remove(video) {
    this.queue = this.queue.filter((v) => v.id != video.id);
  }

  playNext() {
    if (this.queue.length == 0) {
      this.plyr.pause();
    } else {
      const video = this.queue.shift();
      this.play(video);
    }
  }
}

class Scanner {
  constructor() {
    this.el = document.getElementById('scanner-view');
    this.addEventListener = this.el.addEventListener.bind(this.el);

    this.scanner = new Instascan.Scanner({ video: this.el, scanPeriod: 5 });
    this.scanner.addListener('scan', async (url) => {
      try {
        const video = await url2video(url);
        this.el.dispatchEvent(new CustomEvent('scan', { detail: video }));
      } catch (e) {
        console.error(e);
      }
    });
  }

  async start() {
    const cameras = await Instascan.Camera.getCameras();
    if (cameras.length == 0) {
      throw new Error('No cameras found.');
    }
    this.scanner.start(cameras[0]);
  }
}

async function url2video(url) {
  // https://youtu.be/o53sNZVcu-4
  // https://www.youtube.com/watch?v=lxgDdNXe4KA
  const tokens = /(watch\?v=|youtu.be\/)([a-zA-Z0-9\-]*)/.exec(url);
  if (!tokens || tokens.length < 2) {
    throw new Error('Unsupported URL');
  }
  const id = tokens[2];
  const title = '';
  return {id, title, type: 'youtube', date: Date.now()};
}

async function main() {
  const player = new Player();

  new Vue({
    el: '#playlist',
    data: {
      videos: []
    },
    mounted() {
      player.addEventListener('enqueue', (e) => {
        this.videos.push({...e.detail});
      });
      player.addEventListener('dequeue', (e) => {
        this.videos.shift();
      });
    },
    methods: {
      next() {
        player.playNext();
      },
      remove(video) {
        player.remove(video);
        this.videos = this.videos.filter((v) => v.id != video.id);
      }
    }
  });

  await player.init();

  const scanner = new Scanner();
  scanner.addEventListener('scan', (e) => {
    flash();
    player.enqueue(e.detail);
  });
  await scanner.start();
}

function flash() {
  var preview = document.getElementById('scanner-view').parentNode;
  preview.className = 'scanner flash';
  setTimeout(() => {
    preview.className = 'scanner';
  }, 1100);
}

window.addEventListener('load', main);
