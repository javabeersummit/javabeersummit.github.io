// Hamburger menu toggle for mobile
const menuButton = document.getElementById('mobile-menu-button');
const menuDropdown = document.getElementById('mobile-menu-dropdown');
const menuIcon = menuButton.querySelector('svg');
if (menuButton && menuDropdown) {
    menuButton.addEventListener('click', () => {
        menuDropdown.classList.toggle('hidden');
        menuIcon.classList.toggle('animate-spin-slow');
    });
    // Close menu when a link is clicked
    menuDropdown.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuDropdown.classList.add('hidden');
            menuIcon.classList.remove('animate-spin-slow');
        });
    });
}