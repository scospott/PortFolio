
document.addEventListener("DOMContentLoaded", () => {

const modal = document.getElementById("softModal");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const closeModal = document.getElementById("closeModal");
const skillDescriptions = {
    organized: "I developed my sense of organization and efficiency through my work as a chief waiter in Geneva, where managing multiple tasks and priorities was essential to maintain quality service because in the restaurant industry, there’s no room for wasting time.",
    autonomous: "Working in various environments and seasonal jobs taught me to adapt quickly and take initiative without constant supervision.",
    customer: "My restaurant experience in Geneva allowed me to strengthen my communication and customer service skills, ensuring excellent client satisfaction.",
    teamwork: "The professional world and the many projects I worked on during my bachelor's degree and at Epitech taught me how to work effectively in a team, manage projects, follow instructions, and most importantly, adapt to any person I collaborate with — even under pressure.",
    responsible: "Balancing work and studies has trained me to be punctual, dependable, and responsible in all my commitments.",
    loyal: "Reliable and loyal, I value trust and respect in professional relationships.",
    curiosity: "Since I was little, I’ve always had a strong thirst for learning and discovering new things. I never hesitate to ask questions when something interests me. During my childhood, I learned to let my creativity express itself — and that has stayed with me, especially through various projects."
};


document.querySelectorAll('.soft-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.dataset.skill;
        modalTitle.textContent = btn.textContent;
        modalContent.textContent = skillDescriptions[key];
        modal.classList.remove('hidden');
    });
});


closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
});


window.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
});

            const tabs = document.querySelectorAll('.resume-tab');
            const sections = document.querySelectorAll('.content-section');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    sections.forEach(s => s.classList.add('hidden'));

                    document.getElementById(tab.dataset.target).classList.remove('hidden');
                    tabs.forEach(t => t.classList.remove('text-[#00FF9C]'));
                    tabs.forEach(t => t.classList.add('text-gray-300'));

                    tab.classList.remove('text-gray-300');
                    tab.classList.add('text-[#00FF9C]');
                });
            });
});