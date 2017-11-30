window.addEventListener('load', main);

async function main() {
  const player = new Player();

  const playlist = new Playlist();
  playlist.render(player.queue);

  player.addEventListener('enqueue', () => playlist.render(player.queue));
  player.addEventListener('dequeue', () => playlist.render(player.queue));
  playlist.addEventListener('next', () => player.playNext());
  playlist.addEventListener('remove', (e) => {
    player.remove(e.detail);
    playlist.render(player.queue);
  });

  await player.init();

  const scanner = new Scanner({ scanPeriod: 5 });
  scanner.addEventListener('scan', (e) => {
    // Enqueue URL in player
    player.enqueue(e.detail);
  });
  await scanner.start();
}

// A small hack just for the Welcome start link to the #player tab
window.addEventListener('hashchange', (e) => {
  const page = window.location.hash.slice(1);
  document.querySelector(`.tab-${page} input[type='radio']`)
          .setAttribute('checked', 'checked');
});

/*
 * Components
 */

class Player {
  constructor() {
    this.el = document.getElementById('player-view');
    // Use its DOM element to dispatch events.
    this.addEventListener = this.el.addEventListener.bind(this.el);

    this.queue = [];
    // https://plyr.io instance.
    this.plyr = null;
  }

  async init() {
    // Setup plry in DOM.
    this.plyr = plyr.setup(this.el, {
      controls: ['play-large'],
    })[0];
    // Wait for initialization.
    await new Promise((resolve) => this.plyr.on('ready', resolve));

    // Play when video is loaded.
    this.plyr.on('ready', () => this.plyr.togglePlay(true));
    // Play next when current ends.
    this.plyr.on('ended', () => this.playNext());
    // Play next when error occurs.
    this.plyr.on('error', (e) => {
      console.error(e);
      this.playNext();
    });
  }

  play(video) {
    // Load video into player. Will eventually fire 'ready'.
    const {id, type, title} = video;
    this.plyr.source({
      type: 'video',
      title: title,
      sources: [{src: id, type}]
    });
    // Notify that video was loaded.
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
    // Notify that video was enqueued.
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
    if (this.queue.length > 0) {
      // Pop out first item in the queue.
      const video = this.queue.shift();
      this.play(video);
    } else {
      // Nothing to play.
      this.plyr.pause();
    }
  }
}

class Scanner {
  constructor(options) {
    this.el = document.getElementById('scanner-view');
    // Use its DOM element to dispatch events.
    this.addEventListener = this.el.addEventListener.bind(this.el);

    this.scanner = new Instascan.Scanner({ ...options, video: this.el });
    this.scanner.addListener('scan', async (url) => {
      try {
        const video = await url2video(url);
        this.el.dispatchEvent(new CustomEvent('scan', { detail: video }));
        // Flash effect
        flash(this.el.parentNode);
      } catch (e) {
        console.error(e);
      }
    });
  }

  async start() {
    // Use first camera by default.
    const cameras = await Instascan.Camera.getCameras();
    if (cameras.length == 0) {
      throw new Error('No cameras found.');
    }
    this.scanner.start(cameras[0]);
  }
}

class Playlist {
  constructor() {
    this.el = document.getElementById('playlist');
    // Use its DOM element to dispatch events.
    this.addEventListener = this.el.addEventListener.bind(this.el);

    this.nextBtn = this.el.querySelector('#next');
    this.nextBtn.addEventListener('click', () => {
      this.el.dispatchEvent(new CustomEvent('next'));
    });
  }

  render(queue) {
    const list = this.el.querySelector('ul');
    if (queue.length == 0) {
      this.nextBtn.setAttribute('disabled', 'disabled');
      list.innerHTML = '<li class="empty">Empty playlist</li>';
      return;
    }

    list.innerHTML = '';
    this.nextBtn.removeAttribute('disabled');

    for(const video of queue) {
      const li = document.createElement('li');

      const preview = document.createElement('img');
      preview.setAttribute('src', `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`);
      li.appendChild(preview);

      const removeBtn = document.createElement('button');
      removeBtn.innerText = '✖';
      removeBtn.addEventListener('click', () => {
        this.el.dispatchEvent(new CustomEvent('remove', { detail: video }));
      });

      li.appendChild(removeBtn);

      list.appendChild(li);
    }
  }
}

/*
 * Utils
 */
const YOUTUBE_REGEXP = /https:\/\/((www\.)?youtube.com\/watch\?v=|youtu.be\/)([a-zA-Z0-9\-_]*)/;

async function url2video(url) {
  // https://youtu.be/o53sNZVcu-4
  // https://www.youtube.com/watch?v=lxgDdNXe4KA
  const tokens = YOUTUBE_REGEXP.exec(url);
  if (!tokens || tokens.length < 4) {
    throw new Error('Unsupported URL');
  }
  const id = tokens[3];
  const title = '';
  return {id, title, type: 'youtube', date: Date.now()};
}

function flash(el) {
  const before = el.className;
  el.className += ' flash';
  setTimeout(() => {
    preview.className = before;
  }, 1100);
}
