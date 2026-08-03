(function () {
  const STORAGE_INTRO = "notes-supply-site-intro-done";
  let particlesCanvas = null;
  let particlesTeardown = null;
  let terminalWindow = null;
  let terminalTeardown = null;

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {}
  }

  function storageRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (_error) {}
  }

  function createUiFallback() {
    return {
      accents: [],
      currentAccent: function () {
        return document.documentElement.getAttribute("data-accent") || "mauve";
      },
      setAccent: function (value) {
        document.documentElement.setAttribute("data-accent", value);
      }
    };
  }

  function initParticles() {
    const canvas = document.querySelector("[data-hero-particles]");
    if (!canvas || canvas === particlesCanvas) {
      return;
    }

    if (particlesTeardown) particlesTeardown();
    particlesCanvas = canvas;

    var alive = true;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let width = 0;
    let height = 0;
    let particles = [];

    function accentColor() {
      return (
        window.getComputedStyle(canvas).getPropertyValue("--color-accent").trim() || "#cba6f7"
      );
    }

    function resetParticles() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(dpr, dpr);

      const count = Math.max(20, Math.min(60, Math.floor((width * height) / 18000)));
      particles = [];
      for (let index = 0; index < count; index += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25
        });
      }
    }

    function draw() {
      if (!alive) return;
      const accent = accentColor();
      context.clearRect(0, 0, width, height);

      particles.forEach(function (particle) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > width) {
          particle.vx = -particle.vx;
        }
        if (particle.y < 0 || particle.y > height) {
          particle.vy = -particle.vy;
        }
      });

      const connectDistance = 100;
      for (let left = 0; left < particles.length; left += 1) {
        for (let right = left + 1; right < particles.length; right += 1) {
          const dx = particles[left].x - particles[right].x;
          const dy = particles[left].y - particles[right].y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared < connectDistance * connectDistance) {
            const distance = Math.sqrt(distanceSquared);
            const alpha = Math.round((1 - distance / connectDistance) * 0.12 * 255)
              .toString(16)
              .padStart(2, "0");
            context.strokeStyle = accent + alpha;
            context.lineWidth = 0.5;
            context.beginPath();
            context.moveTo(particles[left].x, particles[left].y);
            context.lineTo(particles[right].x, particles[right].y);
            context.stroke();
          }
        }
      }

      context.fillStyle = accent + "30";
      particles.forEach(function (particle) {
        context.beginPath();
        context.arc(particle.x, particle.y, 1.5, 0, Math.PI * 2);
        context.fill();
      });

      window.requestAnimationFrame(draw);
    }

    resetParticles();
    draw();

    window.addEventListener("resize", resetParticles);
    window.addEventListener("notes-supply-site:accentchange", resetParticles);

    particlesTeardown = function () {
      alive = false;
      window.removeEventListener("resize", resetParticles);
      window.removeEventListener("notes-supply-site:accentchange", resetParticles);
    };
  }

  function initTerminal() {
    const windowEl = document.querySelector("[data-terminal-window]");
    if (!windowEl || windowEl === terminalWindow) {
      return;
    }

    if (terminalTeardown) terminalTeardown();

    const hero = document.getElementById("hero-wrapper");
    const bodyEl = document.querySelector("[data-terminal-body]");
    const historyEl = document.querySelector("[data-terminal-history]");
    const inputEl = document.querySelector("[data-terminal-input]");
    const hintSolidEl = document.querySelector("[data-terminal-hint-solid]");
    const hintGhostEl = document.querySelector("[data-terminal-hint-ghost]");
    const inputLineEl = document.querySelector("[data-terminal-input-line]");
    const replayEl = document.querySelector("[data-terminal-replay]");
    const ui = window.notesSupplyUi || createUiFallback();
    const introCommand = "whoami";

    if (
      !hero ||
      !bodyEl ||
      !historyEl ||
      !inputEl ||
      !hintSolidEl ||
      !hintGhostEl ||
      !inputLineEl ||
      !replayEl
    ) {
      return;
    }
    terminalWindow = windowEl;

    const state = {
      commandHistory: [],
      history: [],
      historyIndex: null,
      hintChars: "",
      hintSolidCount: 0,
      hintVisible: false,
      input: "",
      inputStartedAt: performance.now(),
      keyHandler: null,
      timers: []
    };

    function schedule(callback, delay) {
      const id = window.setTimeout(function () {
        state.timers = state.timers.filter(function (value) {
          return value !== id;
        });
        callback();
      }, delay);
      state.timers.push(id);
    }

    function clearTimers() {
      state.timers.forEach(function (id) {
        window.clearTimeout(id);
      });
      state.timers = [];
    }

    function setHeroRevealed(revealed) {
      hero.setAttribute("data-revealed", revealed ? "true" : "false");
      if (revealed) {
        document.documentElement.setAttribute("data-intro-done", "true");
      } else {
        document.documentElement.removeAttribute("data-intro-done");
      }
      inputLineEl.classList.toggle("hidden", revealed);
      windowEl.classList.toggle("term-window-exit", revealed);
    }

    function renderHistory() {
      historyEl.innerHTML = "";
      state.history.forEach(function (line) {
        if (line.kind === "prompt") {
          const row = document.createElement("div");
          row.className = "term-line";
          row.innerHTML =
            '<span class="text-accent">$ </span><span>' +
            escapeHtml(line.content) +
            "</span>";
          historyEl.appendChild(row);
          return;
        }

        if (line.kind === "error") {
          const row = document.createElement("div");
          row.className = "term-line text-red";
          row.textContent = line.content;
          historyEl.appendChild(row);
          return;
        }

        const row = document.createElement("pre");
        row.className = "term-fetch-output";
        row.innerHTML = line.content;
        historyEl.appendChild(row);
      });
    }

    function renderInput() {
      inputEl.textContent = state.input;
      hintSolidEl.textContent = "";
      hintGhostEl.textContent = "";

      if (state.input) {
        return;
      }

      if (state.hintVisible) {
        const chars = state.hintChars.split("");
        hintSolidEl.textContent = chars.slice(0, state.hintSolidCount).join("");
        hintGhostEl.textContent = chars.slice(state.hintSolidCount).join("");
      }
    }

    function render() {
      renderHistory();
      renderInput();
    }

    function scrollBody() {
      schedule(function () {
        bodyEl.scrollTop = bodyEl.scrollHeight;
      }, 10);
    }

    function pushLine(kind, content) {
      state.history.push({ kind: kind, content: content });
      render();
      scrollBody();
    }

    function replaceLoading(label, line) {
      if (
        state.history.length > 0 &&
        state.history[state.history.length - 1].kind === "output" &&
        state.history[state.history.length - 1].content === label
      ) {
        state.history.pop();
      }
      state.history.push(line);
      render();
      scrollBody();
    }

    function hideHint() {
      state.hintVisible = false;
      state.hintChars = "";
      state.hintSolidCount = 0;
      renderInput();
    }

    function scheduleHint() {
      clearTimers();
      schedule(function () {
        if (state.input || storageGet(STORAGE_INTRO)) {
          return;
        }

        state.hintVisible = true;
        state.hintChars = "";
        state.hintSolidCount = 0;
        renderInput();

        introCommand.split("").forEach(function (character, index) {
          schedule(function () {
            if (!state.hintVisible || state.input) {
              return;
            }
            state.hintChars += character;
            renderInput();
          }, index * 280);
        });

        const ghostEnd = (introCommand.length - 1) * 280;
        const solidifyStart = ghostEnd + 400;
        const solidifySpeed = 80;
        introCommand.split("").forEach(function (_character, index) {
          schedule(function () {
            if (!state.hintVisible || state.input) {
              return;
            }
            state.hintSolidCount = index + 1;
            renderInput();
          }, solidifyStart + index * solidifySpeed);
        });

        const solidifyEnd = solidifyStart + introCommand.length * solidifySpeed;
        schedule(function () {
          if (!state.hintVisible || state.input) {
            return;
          }
          hideHint();
          revealFromWhoami(true);
        }, solidifyEnd + 150);
      }, 500);
    }

    function tabComplete(input) {
      const trimmed = input.trim();
      if (!trimmed) {
        return { type: "none" };
      }

      const commands = [
        "whoami",
        "fetch",
        "neofetch",
        "fastfetch",
        "onefetch",
        "theme",
        "ls",
        "eza",
        "exa",
        "cd",
        "z",
        "cat",
        "bat",
        "contact",
        "uptime",
        "help",
        "man",
        "clear"
      ];

      if (!input.endsWith(" ") && !input.includes(" ")) {
        const command = commands.find(function (candidate) {
          return candidate.startsWith(trimmed) && candidate !== trimmed;
        });
        return command ? { type: "complete", value: command } : { type: "none" };
      }

      const parts = trimmed.split(/\s+/, 2);
      const base = parts[0];
      const arg = parts.length > 1 ? parts[1].trim() : "";
      const accentAttr = 'style="color:var(--color-accent)"';

      if (base === "theme") {
        const options = ui.accents
          .map(function (accent) {
            return accent.value;
          })
          .filter(function (option) {
            return !arg || option.startsWith(arg);
          });

        if (options.length === 1) {
          return { type: "complete", value: "theme " + options[0] };
        }

        if (options.length > 0) {
          return {
            type: "options",
            value: options
              .map(function (option) {
                const accent = ui.accents.find(function (candidate) {
                  return candidate.value === option;
                });
                return '<span style="color:' + accent.hex + '">●</span> ' + option;
              })
              .join("  ")
          };
        }
      }

      if (base === "cd" || base === "z") {
        const matches = ["projects", "portfolio", "home"].filter(function (option) {
          return !arg || option.startsWith(arg);
        });
        if (matches.length === 1) {
          return { type: "complete", value: base + " " + matches[0] };
        }
        if (matches.length > 0) {
          return {
            type: "options",
            value: matches
              .map(function (option) {
                return "<span " + accentAttr + ">" + option + "</span>";
              })
              .join("  ")
          };
        }
      }

      if (base === "ls" || base === "eza" || base === "exa") {
        const matches = [".config", "dotfiles"].filter(function (option) {
          return !arg || option.startsWith(arg);
        });
        if (matches.length === 1) {
          return { type: "complete", value: base + " " + matches[0] };
        }
        if (matches.length > 0) {
          return {
            type: "options",
            value: matches
              .map(function (option) {
                return "<span " + accentAttr + ">" + option + "</span>";
              })
              .join("  ")
          };
        }
      }

      if (base === "cat" || base === "bat") {
        const matches = [
          "about.md",
          "skills.txt",
          "contact.txt",
          "README.md",
          ".env",
          ".bashrc",
          ".zshrc",
          "config.fish"
        ].filter(function (option) {
          return !arg || option.toLowerCase().startsWith(arg.toLowerCase());
        });
        if (matches.length === 1) {
          return { type: "complete", value: base + " " + matches[0] };
        }
        if (matches.length > 0) {
          return {
            type: "options",
            value: matches
              .map(function (option) {
                return "<span " + accentAttr + ">" + option + "</span>";
              })
              .join("  ")
          };
        }
      }

      return { type: "none" };
    }

    function formatFetchOutput(data) {
      const accentAttr = 'style="color:var(--color-accent)"';
      const dimAttr = 'style="color:var(--color-text-dim)"';
      const textAttr = 'style="color:var(--color-text)"';
      const art = [
        '<span ' + accentAttr + '>██\\\\    ██</span>',
        '<span ' + accentAttr + '>██ \\\\   ██</span>',
        '<span ' + accentAttr + '>██  \\\\  ██</span>',
        '<span ' + accentAttr + '>██   \\\\ ██</span>',
        '<span ' + accentAttr + '>██    \\\\██</span>'
      ];
      const languageColors = ["#f38ba8", "#fab387", "#f9e2af", "#a6e3a1", "#89b4fa", "#cba6f7"];
      const languageLines = [];
      let currentLine = "";

      data.languages.forEach(function (language, index) {
        const color = languageColors[index] || "#9898a0";
        const entry =
          '<span style="color:' +
          color +
          '">●</span> <span ' +
          textAttr +
          ">" +
          escapeHtml(language.name) +
          "</span> <span " +
          dimAttr +
          ">(" +
          Math.round(language.percent) +
          "%)</span>";
        if (index % 2 === 0) {
          currentLine = "  " + entry;
        } else {
          currentLine += "  " + entry;
          languageLines.push(currentLine);
          currentLine = "";
        }
      });

      if (currentLine) {
        languageLines.push(currentLine);
      }

      const stats = [
        '<span ' + accentAttr + '>OneNoted</span> <span ' + dimAttr + '>~</span> <span ' + textAttr + '>github</span>',
        '<span ' + dimAttr + '>───────────────────────</span>',
        '<span ' + dimAttr + '>Languages:</span>'
      ]
        .concat(languageLines)
        .concat([
          '<span ' + dimAttr + '>Repos:</span> <span ' + textAttr + '>' + data.repos + "</span>",
          '<span ' + dimAttr + '>Stars:</span> <span ' + textAttr + '>★ ' + data.stars + "</span>",
          '<span ' + dimAttr + '>Forks:</span> <span ' + textAttr + '>⑂ ' + data.forks + "</span>",
          '<span ' + dimAttr + '>Contributions:</span> <span ' + textAttr + '>' + data.contributions + "</span>",
          '<span ' + dimAttr + '>Latest:</span> <span ' + accentAttr + '>' + escapeHtml(data.latest_project) + '</span> <span ' + dimAttr + '>(' + escapeHtml(data.latest_updated) + ")</span>",
          "",
          '<span style="color:#b4befe;font-style:italic">󰫣 Ex Astris, Scientia</span>'
        ]);

      const swatches = ["#f38ba8", "#fab387", "#f9e2af", "#a6e3a1", "#94e2d5", "#89b4fa", "#cba6f7", "#f5c2e7"];

      let output = "\n";
      stats.forEach(function (stat, index) {
        output += "  " + (art[index] || "          ") + "   " + stat + "\n";
      });
      output += "\n  ";
      swatches.forEach(function (swatch) {
        output += '<span style="color:' + swatch + '">██</span> ';
      });
      output += "\n";
      return output;
    }

    function outputContact() {
      return (
        '<span style="color:var(--color-accent)">Email:</span>    <span style="color:var(--color-text)">contact@notes.supply</span>\n' +
        '<span style="color:var(--color-accent)">GitHub:</span>   <span style="color:var(--color-text)">github.com/notes-supply</span>\n' +
        '<span style="color:var(--color-accent)">Website:</span>  <span style="color:var(--color-text)">notes.supply</span>\n' +
        '<span style="color:var(--color-accent)">Scope:</span>    <span style="color:var(--color-text)">DevOps, Kubernetes, IT infrastructure, custom software</span>'
      );
    }

    function outputHelp() {
      return (
        '<span style="color:var(--color-text-dim)">available commands:</span>\n' +
        '  <span style="color:var(--color-accent)">whoami</span>        <span style="color:var(--color-text-dim)">—</span> reveal notes.supply\n' +
        '  <span style="color:var(--color-accent)">fetch</span>         <span style="color:var(--color-text-dim)">—</span> show github stats\n' +
        '  <span style="color:var(--color-accent)">ls</span>            <span style="color:var(--color-text-dim)">—</span> list repositories\n' +
        '  <span style="color:var(--color-accent)">cat</span> <span style="color:var(--color-text-dim)">&lt;file&gt;</span>    <span style="color:var(--color-text-dim)">—</span> read a file or repo README\n' +
        '  <span style="color:var(--color-accent)">theme</span> <span style="color:var(--color-text-dim)">&lt;name&gt;</span>  <span style="color:var(--color-text-dim)">—</span> change accent\n' +
        '  <span style="color:var(--color-accent)">cd</span> <span style="color:var(--color-text-dim)">&lt;path&gt;</span>     <span style="color:var(--color-text-dim)">—</span> navigate\n' +
        '  <span style="color:var(--color-accent)">contact</span>       <span style="color:var(--color-text-dim)">—</span> show contact info\n' +
        '  <span style="color:var(--color-accent)">uptime</span>        <span style="color:var(--color-text-dim)">—</span> time on page\n' +
        '  <span style="color:var(--color-accent)">clear</span>         <span style="color:var(--color-text-dim)">—</span> clear terminal\n' +
        '  <span style="color:var(--color-accent)">help</span>          <span style="color:var(--color-text-dim)">—</span> show this message'
      );
    }

    function handleTheme(arg) {
      if (!arg) {
        const current = ui.currentAccent();
        let output =
          '<span style="color:var(--color-text-dim)">current:</span> <span style="color:var(--color-accent)">' +
          current +
          "</span>\n\n" +
          '<span style="color:var(--color-text-dim)">available accents:</span>\n';

        ui.accents.forEach(function (accent) {
          output += '  <span style="color:' + accent.hex + '">●</span> ' + accent.value;
          if (accent.value === current) {
            output += ' <span style="color:var(--color-text-dim)">← current</span>';
          }
          output += "\n";
        });

        output += '\n<span style="color:var(--color-text-dim)">usage:</span> theme <span style="color:var(--color-text-dim)">&lt;name&gt;</span>';
        pushLine("output", output);
        return;
      }

      const accent = ui.accents.find(function (candidate) {
        return candidate.value === arg;
      });
      if (!accent) {
        pushLine("error", "unknown accent: " + arg + ". type 'theme' to see available options");
        return;
      }

      ui.setAccent(accent.value);
      pushLine(
        "output",
        'accent set to <span style="color:' + accent.hex + '">' + accent.value + '</span> <span style="color:' + accent.hex + '">●</span>'
      );
    }

    function handleCd(arg) {
      if (!arg) {
        pushLine(
          "output",
          '<span style="color:var(--color-text-dim)">usage:</span> cd <span style="color:var(--color-text-dim)">&lt;path&gt;</span>\n' +
            '<span style="color:var(--color-text-dim)">paths:</span> <span style="color:var(--color-accent)">/</span>  <span style="color:var(--color-accent)">projects</span>  <span style="color:var(--color-accent)">portfolio</span>  <span style="color:var(--color-accent)">&lt;project-name&gt;</span>'
        );
        return;
      }

      const clean = arg.trimStart().replace(/^\/+/, "");
      if (!clean || clean === "~" || clean === "home") {
        window.location.href = "/";
      } else if (clean === "portfolio") {
        window.location.href = "https://portfolio.notes.supply";
      } else if (clean === "projects") {
        window.location.href = "/projects";
      } else if (clean.startsWith("project/")) {
        const slug = clean.slice("project/".length);
        if (slug) {
          window.location.href = "/project/" + slug;
        }
      } else {
        window.location.href = "/project/" + clean;
      }
    }

    function handleCat(arg) {
      const dim = 'style="color:var(--color-text-dim)"';
      const accent = 'style="color:var(--color-accent)"';
      const text = 'style="color:var(--color-text)"';

      if (!arg) {
        pushLine(
          "output",
          "<span " + dim + ">usage:</span> cat <span " + dim + ">&lt;file&gt;</span>\n\n" +
            "<span " + dim + ">files:</span>\n" +
            "  <span " + accent + ">about.md</span>      <span " + dim + ">—</span> about this site\n" +
            "  <span " + accent + ">skills.txt</span>    <span " + dim + ">—</span> stack + tools\n" +
            "  <span " + accent + ">contact.txt</span>   <span " + dim + ">—</span> links\n" +
            "  <span " + accent + ">README.md</span>     <span " + dim + ">—</span> welcome\n" +
            "  <span " + accent + ">&lt;project&gt;</span>     <span " + dim + ">—</span> fetch project README from GitHub"
        );
        return;
      }

      if (arg === "about.md") {
        pushLine(
          "output",
          "<span " + accent + "># About</span>\n\n" +
            "<span " + text + ">notes.supply builds and operates practical software, systems,\nand infrastructure: DevOps, Kubernetes, self-hosted platforms,\ncustom tools, and the glue code that keeps teams moving.\n\nThe landing page keeps the old terminal ritual intact while\nthe surrounding site stays intentionally minimal: just the\nhero, live GitHub data, and direct paths into repositories.</span>"
        );
        return;
      }

      if (arg === "skills.txt" || arg === "skills") {
        pushLine(
          "output",
          '<span ' + accent + ">Languages:</span>    <span " + text + ">Rust, TypeScript, Go, Nix</span>\n" +
            '<span ' + accent + ">Infra:</span>        <span " + text + ">Kubernetes, Proxmox, Docker, NixOS</span>\n" +
            '<span ' + accent + ">Frontend:</span>     <span " + text + ">Dioxus, Leptos, HTMX, WASM</span>\n" +
            '<span ' + accent + ">Tools:</span>        <span " + text + ">Neovim, Fish, Hyprland, Git</span>'
        );
        return;
      }

      if (arg === "contact.txt" || arg === "contact") {
        pushLine("output", outputContact());
        return;
      }

      if (arg === "README.md" || arg === "readme.md" || arg === "readme") {
        pushLine(
          "output",
          "<span " + accent + "># notes.supply</span>\n\n" +
            "<span " + text + ">A terminal-first shell for GitHub activity, repository spelunking,\nand the surrounding notes that hold the whole mess together.</span>\n\n" +
            "<span " + dim + ">Type</span> <span " + accent + ">whoami</span> <span " + dim + ">to enter, or poke around with</span> <span " + accent + ">help</span>"
        );
        return;
      }

      if (arg === ".env") {
        pushLine("output", '<span style="color:#f38ba8">nice try &#128527;</span>');
        return;
      }

      if (arg === "/etc/passwd" || arg === "passwd") {
        pushLine("error", "permission denied: /etc/passwd");
        return;
      }

      if (arg === ".bashrc" || arg === ".zshrc") {
        pushLine("output", '<span style="color:#94e2d5">I use fish btw &#128031;</span>');
        return;
      }

      if (arg === ".config/fish/config.fish" || arg === "config.fish") {
        pushLine(
          "output",
          "<span " + dim + "># there you go</span>\n" +
            "<span " + accent + ">set -x</span> <span " + text + ">EDITOR nvim</span>\n" +
            "<span " + accent + ">alias</span> <span " + text + ">ls eza</span>\n" +
            "<span " + accent + ">alias</span> <span " + text + ">cat bat</span>\n" +
            "<span " + accent + ">starship</span> <span " + text + ">init fish | source</span>"
        );
        return;
      }

      pushLine("output", "fetching README...");
      fetch("/api/readme/" + encodeURIComponent(arg))
        .then(function (response) {
          if (!response.ok) {
            throw new Error("not found");
          }
          return response.text();
        })
        .then(function (textValue) {
          const escaped = escapeHtml(textValue);
          const truncated =
            escaped.length > 2000
              ? escaped.slice(0, 2000) +
                '\n\n<span style="color:var(--color-text-dim)">... truncated (cat the full README on GitHub)</span>'
              : escaped;
          replaceLoading("fetching README...", {
            kind: "output",
            content: '<span style="color:var(--color-text)">' + truncated + "</span>"
          });
        })
        .catch(function () {
          replaceLoading("fetching README...", {
            kind: "error",
            content: "no such file: " + arg
          });
        });
    }

    function fetchStats() {
      fetch("/api/stats")
        .then(function (response) {
          if (!response.ok) {
            throw new Error("fetch failed");
          }
          return response.json();
        })
        .then(function (data) {
          replaceLoading("fetching...", {
            kind: "output",
            content: formatFetchOutput(data)
          });
        })
        .catch(function (error) {
          replaceLoading("fetching...", {
            kind: "error",
            content: "fetch error: " + error.message
          });
        });
    }

    function fetchProjects() {
      fetch("/api/projects")
        .then(function (response) {
          if (!response.ok) {
            throw new Error("fetch failed");
          }
          return response.json();
        })
        .then(function (projects) {
          const dim = 'style="color:var(--color-text-dim)"';
          const accent = 'style="color:var(--color-accent)"';
          const text = 'style="color:var(--color-text)"';
          let output =
            "\n<span " + dim + ">" +
            "NAME".padEnd(22) + " " + "LANG".padEnd(12) + " " + "★".padStart(4) +
            "   UPDATED</span>\n";

          projects.forEach(function (project) {
            const name = project.name || "";
            const displayName = name.length > 20 ? name.slice(0, 19) + "..." : name;
            const language = project.language || "—";
            output +=
              "<span " + accent + ">" + escapeHtml(displayName.padEnd(22)) + "</span> <span " +
              text + ">" + escapeHtml(language.padEnd(12)) + "</span> <span " +
              dim + ">" + String(project.stars || 0).padStart(4) + "</span>   <span " +
              dim + ">" + escapeHtml(project.updated || "") + "</span>\n";
          });

          replaceLoading("loading...", { kind: "output", content: output });
        })
        .catch(function (error) {
          replaceLoading("loading...", {
            kind: "error",
            content: "ls error: " + error.message
          });
        });
    }

    function executeCommand(command) {
      clearTimers();
      hideHint();
      var parts = command.split(/\s+/, 2);
      var base = parts[0] || "";
      var arg = parts.length > 1 ? parts[1].trim() : "";

      if (command) {
        state.commandHistory.push(command);
      }
      state.historyIndex = null;

      if (!command) {
        pushLine("prompt", "");
        if (!storageGet(STORAGE_INTRO)) {
          scheduleHint();
        }
      } else if (base === "whoami") {
        revealFromWhoami(false);
      } else if (["fetch", "neofetch", "fastfetch", "onefetch"].includes(base)) {
        pushLine("prompt", command);
        pushLine("output", "fetching...");
        fetchStats();
      } else if (base === "theme") {
        pushLine("prompt", command);
        handleTheme(arg);
      } else if (["ls", "eza", "exa"].includes(base)) {
        pushLine("prompt", command);
        if (arg === ".config" || arg === "dotfiles") {
          handleCd("dotfiles");
        } else {
          pushLine("output", "loading...");
          fetchProjects();
        }
      } else if (base === "cd" || base === "z") {
        pushLine("prompt", command);
        handleCd(arg);
      } else if (base === "cat" || base === "bat") {
        pushLine("prompt", command);
        handleCat(arg);
      } else if (base === "contact") {
        pushLine("prompt", command);
        pushLine("output", outputContact());
      } else if (base === "uptime") {
        pushLine("prompt", command);
        const elapsedSeconds = Math.floor((performance.now() - state.inputStartedAt) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        pushLine(
          "output",
          '<span style="color:var(--color-text-dim)">up</span> <span style="color:var(--color-text)">' +
            minutes + "m " + seconds + "s</span>"
        );
      } else if (base === "help" || base === "man") {
        pushLine("prompt", command);
        pushLine("output", outputHelp());
      } else if (base === "clear") {
        state.history = [];
        render();
      } else {
        pushLine("prompt", command);
        pushLine("error", "command not found: " + base + ". type 'help' for available commands");
      }

      state.input = "";
      renderInput();
      scrollBody();
    }

    function detachKeyHandler() {
      if (state.keyHandler) {
        document.removeEventListener("keydown", state.keyHandler);
        state.keyHandler = null;
      }
    }

    function attachKeyHandler() {
      if (state.keyHandler) {
        return;
      }

      state.keyHandler = function (event) {
        const key = event.key;

        if (key === " " || key === "Tab" || key === "ArrowUp" || key === "ArrowDown") {
          event.preventDefault();
        }

        if (state.hintVisible) {
          if (key === "Enter") {
            state.input = introCommand;
            hideHint();
          } else if (key !== "ArrowUp" && key !== "ArrowDown") {
            hideHint();
          }
        }

        if (key === "ArrowUp") {
          if (!state.commandHistory.length) {
            return;
          }
          state.historyIndex =
            state.historyIndex === null
              ? state.commandHistory.length - 1
              : Math.max(0, state.historyIndex - 1);
          state.input = state.commandHistory[state.historyIndex];
          renderInput();
          return;
        }

        if (key === "ArrowDown") {
          if (state.historyIndex === null) {
            return;
          }
          if (state.historyIndex + 1 < state.commandHistory.length) {
            state.historyIndex += 1;
            state.input = state.commandHistory[state.historyIndex];
          } else {
            state.historyIndex = null;
            state.input = "";
          }
          renderInput();
          return;
        }

        if (key === "Tab") {
          const completion = tabComplete(state.input);
          if (completion.type === "complete") {
            state.input = completion.value;
            renderInput();
          } else if (completion.type === "options") {
            pushLine("prompt", state.input);
            pushLine("output", completion.value);
          }
          return;
        }

        if (key === "Enter") {
          executeCommand(state.input.trim().toLowerCase());
          return;
        }

        if (key === "Backspace") {
          state.input = state.input.slice(0, -1);
          renderInput();
          return;
        }

        if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          state.input += key;
          renderInput();
        }
      };

      document.addEventListener("keydown", state.keyHandler);
    }

    function revealFromWhoami(autoReveal) {
      clearTimers();
      hideHint();
      if (!autoReveal) {
        pushLine("prompt", introCommand);
      }
      storageSet(STORAGE_INTRO, "true");
      state.input = "";
      renderInput();
      detachKeyHandler();

      // Act 1: Terminal dissolves (0ms)
      inputLineEl.classList.add("hidden");
      windowEl.classList.add("term-window-exit");

      // Act 2: Collapse terminal from layout + reveal everything (450ms)
      schedule(function () {
        windowEl.classList.add("hidden");
        hero.classList.add("has-revealed");
        setHeroRevealed(true);
      }, 450);
    }

    function resetTerminal() {
      storageRemove(STORAGE_INTRO);
      clearTimers();
      state.commandHistory = [];
      state.history = [];
      state.historyIndex = null;
      state.input = "";
      state.inputStartedAt = performance.now();
      hideHint();

      // Fade out hero content and replay first
      hero.setAttribute("data-revealed", "false");
      document.documentElement.removeAttribute("data-intro-done");

      // After content fades, bring terminal back
      schedule(function () {
        windowEl.classList.remove("hidden", "term-window-exit");
        inputLineEl.classList.remove("hidden");
        render();
        attachKeyHandler();
        scheduleHint();
      }, 350);
    }

    replayEl.addEventListener("click", resetTerminal);

    terminalTeardown = function () {
      detachKeyHandler();
      clearTimers();
      replayEl.removeEventListener("click", resetTerminal);
    };

    if (storageGet(STORAGE_INTRO)) {
      windowEl.classList.add("hidden");
      hero.classList.add("has-revealed");
      setHeroRevealed(true);
      render();
      return;
    }

    render();
    attachKeyHandler();
    scheduleHint();
  }

  function bootHome() {
    function tryInit() {
      if (!document.getElementById("hero-wrapper")) {
        return false;
      }
      initParticles();
      initTerminal();
      return !!particlesCanvas && !!terminalWindow;
    }

    tryInit();

    var observer = new MutationObserver(function () {
      tryInit();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  onReady(function () {
    bootHome();
  });
})();
