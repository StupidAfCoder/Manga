let slideIndex = 1;
// Initialize
showSlides(slideIndex);

// Next/previous controls
function plusSlides(n) {
  showSlides((slideIndex += n));
}

// Thumbnail image controls
function currentSlide(n) {
  showSlides((slideIndex = n));
}

function showSlides(n) {
  let i;
  let slides = document.getElementsByClassName("mySlides");
  
  // Wrap around if at end
  if (n > slides.length) {
    slideIndex = 1;
  }
  // Wrap around if at start
  if (n < 1) {
    slideIndex = slides.length;
  }
  
  // Hide all slides
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  
  // Show the current slide
  if (slides.length > 0) {
      slides[slideIndex - 1].style.display = "block";
  }
}