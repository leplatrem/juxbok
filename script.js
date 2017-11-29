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

class Playlist {
  constructor(player) {
    this.player = player;
    this.el = document.querySelector('#playlist');
  }

  render() {
    const queue = this.player.queue;
    const nextBtn = this.el.querySelector('#next');
    const list = this.el.querySelector('ul');
    if (queue.length == 0) {
      list.innerHTML = '<li class="empty">Empty playlist</li>';
      nextBtn.setAttribute('disabled', 'disabled');
      return;
    }
    list.innerHTML = '';
    nextBtn.removeAttribute('disabled');

    for(const video of queue) {
      const li = document.createElement('li');

      const preview = document.createElement('img');
      preview.setAttribute('src', `https://img.youtube.com/vi/${video.id}/default.jpg`);
      li.appendChild(preview);

      const removeBtn = document.createElement('button');
      removeBtn.innerText = '✖';
      removeBtn.addEventListener('click', () => this.player.remove(video));
      li.appendChild(removeBtn);

      list.appendChild(li);
    }
  }
}

async function main() {
  const player = new Player();
  await player.init();

  const scanner = new Scanner();
  scanner.addEventListener('scan', (e) => {
    flash();
    player.enqueue(e.detail);
  });
  await scanner.start();

  const playlist = new Playlist(player);
  playlist.render();
  player.addEventListener('enqueue', () => playlist.render());
  player.addEventListener('dequeue', () => playlist.render());
}

function flash() {
  var preview = document.getElementById('scanner-view').parentNode;
  preview.className = 'scanner flash';
  setTimeout(() => {
    preview.className = 'scanner';
  }, 1100);
}

window.addEventListener('load', main);
