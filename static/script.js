let cart = JSON.parse(localStorage.getItem("cart")) || [];
let customProduct = {};

function updateCartDisplay() {
  const cartItems = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  const cartCount = document.getElementById("cartCountBadge");
  cartItems.innerHTML = "";
  let total = 0;
  cart.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `${item.name} - ₹${item.price} <button class='btn btn-sm btn-danger' onclick='removeCartItem(${index})'>×</button>`;
    cartItems.appendChild(li);
    total += item.price;
  });
  cartTotal.textContent = total;
  cartCount.textContent = cart.length;
  localStorage.setItem("cart", JSON.stringify(cart));
}

function removeCartItem(index) {
  cart.splice(index, 1);
  updateCartDisplay();
}

function openCart() {
  document.getElementById("cartModal").style.display = "block";
  updateCartDisplay();
}

function closeCart() {
  document.getElementById("cartModal").style.display = "none";
}

function openCustomModal(productName, productPrice) {
  document.getElementById("customModal").style.display = "block";
  document.getElementById("addCustomBtn").disabled = true;
  customProduct = { name: productName, price: productPrice, design: null };
}

function closeCustomModal() {
  document.getElementById("customModal").style.display = "none";
  document.getElementById("previewDesign").style.display = "none";
  document.getElementById("customFile").value = "";
}

document.querySelectorAll(".add-to-cart").forEach(button => {
  button.addEventListener("click", function () {
    const name = this.getAttribute("data-name");
    const price = parseInt(this.getAttribute("data-price"));
    cart.push({ name, price });
    updateCartDisplay();
    showToast("Added to cart!");
  });
});

document.querySelectorAll(".customize-btn").forEach(button => {
  button.addEventListener("click", function () {
    const name = this.getAttribute("data-name");
    const price = parseInt(this.getAttribute("data-price"));
    openCustomModal(name, price);
  });
});

document.getElementById("customFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed!");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      document.getElementById("previewDesign").src = event.target.result;
      document.getElementById("previewDesign").style.display = "block";
      customProduct.design = event.target.result;
      document.getElementById("addCustomBtn").disabled = false;
    };
    reader.readAsDataURL(file);
  }
});

function addCustomProduct() {
  if (!customProduct || !customProduct.design) {
    alert("Upload a design first.");
    return;
  }
  cart.push(customProduct);
  updateCartDisplay();
  closeCustomModal();
  openCart();
  showToast("Customized product added!");
  setTimeout(() => {
    window.location.href = "payment.html";
  }, 1000);
}

function showToast(msg = "Item added!") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
  } else {
    toast.textContent = msg;
  }
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), 2000);
}

document.getElementById("mySelect").addEventListener("change", function () {
  const value = this.value;
  document.querySelectorAll(".product-card").forEach(card => {
    const category = card.getAttribute("data-category");
    if (value === "all" || value === category) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });
});

updateCartDisplay();

// wishlist category
// Scroll to Top functionality
window.onscroll = () => {
  document.getElementById("scrollBtn").style.display = 
    document.documentElement.scrollTop > 300 ? "block" : "none";
};

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Wishlist functionality
let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];

function toggleWishlist(product) {
  const index = wishlist.findIndex(item => item.name === product.name);
  if (index !== -1) {
    wishlist.splice(index, 1);
    showToast("Removed from Wishlist");
  } else {
    wishlist.push(product);
    showToast("Added to Wishlist");
  }
  localStorage.setItem("wishlist", JSON.stringify(wishlist));
}

// welcome message
function displayPersonalGreeting() {
  const user = JSON.parse(localStorage.getItem("destinyFashionLoggedInUser"));
  if (!user) return;

  const greetingDiv = document.getElementById("userGreeting");
  if (!greetingDiv) return;

  let locationMsg = "";

  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      locationMsg = `📍 Namaste ${data.city || 'India'}! Special discount for you today.`;
      greetingDiv.innerHTML = `👋 Welcome back, ${user.name}! Have a great shopping – latest designs and offers await!<br>${locationMsg}`;
      greetingDiv.style.display = "block";
    })
    .catch(() => {
      greetingDiv.innerHTML = `👋 Welcome back, ${user.name}! Have a great shopping – latest designs and offers await!`;
      greetingDiv.style.display = "block";
    });
}

displayPersonalGreeting();

// coupon getting chance
const rewards = [
  "🎁 10% OFF Coupon",
  "🎉 Free Shipping",
  "💥 ₹100 OFF",
  "🎊 No Luck Today 😢",
  "🔥 Buy 1 Get 1 Free",
  "⭐ 20% OFF Coupon"
];

const spinBtn = document.getElementById("spinBtn");
const resultText = document.getElementById("spinResult");
const spinCanvas = document.getElementById("wheelCanvas");
const ctx = spinCanvas.getContext("2d");

document.getElementById("spinTrigger").addEventListener("click", () => {
  document.getElementById("spinModal").style.display = "block";
  drawWheel();
});

spinBtn.addEventListener("click", () => {
  const today = new Date().toDateString();
  const lastSpin = localStorage.getItem("lastSpinDate");

  if (lastSpin === today) {
    resultText.textContent = "🚫 You can only spin once per day!";
    return;
  }

  const rewardIndex = Math.floor(Math.random() * rewards.length);
  resultText.textContent = "🌀 Spinning...";
  spinBtn.disabled = true;

  setTimeout(() => {
    resultText.textContent = `🎯 You won: ${rewards[rewardIndex]}`;
    localStorage.setItem("lastSpinDate", today);
    spinBtn.disabled = false;
  }, 2000);
});

function drawWheel() {
  const radius = 150;
  const center = spinCanvas.width / 2;
  ctx.clearRect(0, 0, spinCanvas.width, spinCanvas.height);

  for (let i = 0; i < rewards.length; i++) {
    const angle = (2 * Math.PI / rewards.length) * i;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, angle, angle + 2 * Math.PI / rewards.length);
    ctx.fillStyle = i % 2 === 0 ? "#ffc107" : "#333";
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle + Math.PI / rewards.length);
    ctx.fillText(rewards[i], radius / 1.5, 10);
    ctx.restore();
  }
}
