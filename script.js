const slider = document.querySelector(".slider");
const images = slider.querySelectorAll("img");
let currentSlide = 0;

function showSlide(index) {
    images.forEach((img, idx) => {
        img.style.display = idx === index ? "block" : "none";
    });
}
function nextSlide() {
    currentSlide = (currentSlide + 1) % images.length;
    showSlide(currentSlide);
}

showSlide(currentSlide);
setInterval(nextSlide, 1500); 