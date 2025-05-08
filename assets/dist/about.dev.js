"use strict";

var navbarToggle = document.querySelector('.navbar-toggle');
var navbarLinks = document.querySelector('.navbar-links ul');
var activitySection = document.querySelector('.activity-section');
var loginBtn = document.querySelector('.btn');
var signupBtn = document.querySelector('.btn1');
navbarToggle.addEventListener('click', function () {
  navbarLinks.classList.toggle('show');
  activitySection.classList.toggle('hide');
  loginBtn.classList.toggle('hide');
  signupBtn.classList.toggle('hide');
}); // Add the following CSS to style the hide class
// .hide {
//   display: none;
// }
//# sourceMappingURL=about.dev.js.map
