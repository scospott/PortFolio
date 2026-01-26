document.addEventListener("DOMContentLoaded", () => {
  const projects = [
    {
      title: "Research work on football coaches' performance",
      category: "",
      description:
        "Data analysis, database manipulation, and statistical modeling in R. Analysis of descriptive statistics and graphs in a sports context to evaluate coaches' performance.",
      tech: "R , Python",
      img: "image/project1.png",
      number: "01",
      link: "https://mathisdrn.github.io/head_coach_dismissal/",
      github: "https://github.com/mathisdrn/head_coach_dismissal",
    },
    {
      title: "Board Game Creation in Python:",
      category: "",
      description:
        "Full development of a chess game. Design and modeling of games such as Connect Four, hangman, Tic-Tac-Toe, Battleship, and Pig game.",
      tech: "python, pygame",
      img: "image/echec.jpg",
      number: "02",
      link: "#",
      github: "#",
    },
    {
      title: "Crime-Solving Project",
      category: "",
      description:
        "Data extraction through APIs from various data frames (cameras, public transport, etc.) to solve fictional murder cases in the city of Rennes.",
      tech: "Python, R",
      img: "image/crime.png",
      number: "03",
      link: "#",
      github: "#",
    },
  ];

  let current = 0;
  const projectInfo = document.getElementById("project-info");
  const projectImage = document.getElementById("project-image");
  const nextBtn = document.getElementById("next-btn");
  const prevBtn = document.getElementById("prev-btn");

  // Si la page ne contient pas ces éléments (ou DOM pas chargé), on évite de planter
  if (!projectInfo || !projectImage || !nextBtn || !prevBtn) {
    console.warn("Project slider: éléments DOM manquants.");
    return;
  }

  function updateProject(index) {
    const project = projects[index];

    projectInfo.style.opacity = "0";
    projectImage.style.opacity = "0";

    setTimeout(() => {
      projectInfo.innerHTML = `
        <h1 class="text-white text-9xl font-semibold">${project.number}</h1>
        <p class="text-[#00FF9C] uppercase text-sm font-semibold mb-2">${project.category || ""}</p>
        <h2 class="text-3xl md:text-4xl font-bold mb-4">${project.title}</h2>
        <p class="text-gray-400 mb-6 leading-relaxed">${project.description}</p>
        <p class="text-[#00FF9C] font-semibold mb-6">${project.tech}</p>

        <div class="flex space-x-4">
          <a href="${project.link}" target="_blank" rel="noopener"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-800 text-white hover:bg-[#00e68c] transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5h7m0 0v7m0-7L10 16" />
            </svg>
          </a>

          <a href="${project.github}" target="_blank" rel="noopener"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-800 text-white hover:bg-[#00e68c] transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.754-1.335-1.754-1.09-.745.082-.73.082-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.997.108-.775.418-1.305.762-1.605-2.665-.3-5.467-1.335-5.467-5.933 0-1.31.468-2.38 1.236-3.22-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 013-.405c1.02.005 2.045.138 3 .405 2.29-1.552 3.297-1.23 3.297-1.23.654 1.653.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.63-5.48 5.922.43.37.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .32.217.694.825.576C20.565 21.796 24 17.296 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      `;

      projectImage.src = project.img;
      projectImage.alt = project.title;

      projectInfo.style.opacity = "1";
      projectImage.style.opacity = "1";
    }, 400);
  }

  nextBtn.addEventListener("click", () => {
    current = (current + 1) % projects.length;
    updateProject(current);
  });

  prevBtn.addEventListener("click", () => {
    current = (current - 1 + projects.length) % projects.length;
    updateProject(current);
  });


});
