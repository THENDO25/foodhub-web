const navbarToggle = document.querySelector('.navbar-toggle');
const navbarLinks = document.querySelector('.navbar-links ul');
const activitySection = document.querySelector('.activity-section');
const loginBtn = document.querySelector('.btn');
const signupBtn = document.querySelector('.btn1');

navbarToggle.addEventListener('click', () => {
  navbarLinks.classList.toggle('show');
  activitySection.classList.toggle('hide');
  loginBtn.classList.toggle('hide');
  signupBtn.classList.toggle('hide');
});

// Add the following CSS to style the hide class
// .hide {
//   display: none;
// }