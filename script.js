// Get references to DOM elements
const dropArea = document.getElementById("drop-area");
const uploadInput = document.getElementById("upload");
const colorPicker = document.getElementById("color-picker");
const colorPreview = document.getElementById("color-preview");
const restoreColorBtn = document.getElementById("restore-color-btn");
const thumbnailImg = document.getElementById("thumbnail");
const downloadBtn = document.getElementById("downloadBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// State variables
let originalImage = null; // Store the original uploaded image object
let extractedColor = "#000000"; // Default black if no image is uploaded or color extraction fails
let currentPaddingColor = "#000000"; // Initially set the padding color to black

// --- Event Listeners ---

// Trigger file input when drop area clicked
dropArea.addEventListener("click", () => {
  uploadInput.click();
});

// Handle file upload via drag-and-drop
dropArea.addEventListener("dragover", (event) => {
  event.preventDefault(); // Necessary to allow drop
  dropArea.classList.add("dragover");
});
dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("dragover");
});
dropArea.addEventListener("drop", (event) => {
  event.preventDefault();
  dropArea.classList.remove("dragover");
  const file = event.dataTransfer.files[0];
  if (file) {
    handleImageUpload(file);
  }
});

// Handle file upload from input
uploadInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    handleImageUpload(file);
  }
});

// *** Handle background color change in the preview ***
colorPicker.addEventListener("input", (event) => {
  const selectedColor = event.target.value;
  colorPreview.style.backgroundColor = selectedColor; // Update the small color preview circle

  // Update the padding color state
  currentPaddingColor = selectedColor;

  // *** Re-render the thumbnail with the new padding color IF an image exists ***
  if (originalImage) {
    redrawThumbnail(); // Call the function to update the main preview
  }

  // Show/hide the restore button based on color difference
  toggleRestoreButtonVisibility();
});

// Restore the original background color
restoreColorBtn.addEventListener("click", () => {
  // Reset color picker and preview to the extracted color
  colorPreview.style.backgroundColor = extractedColor;
  colorPicker.value = rgbToHex(extractedColor); // Ensure picker matches
  currentPaddingColor = extractedColor; // Reset padding color state

  // Re-render the thumbnail with the restored color IF an image exists
  if (originalImage) {
    redrawThumbnail();
  }

  // Hide restore button after restoring
  toggleRestoreButtonVisibility();
});

// --- Core Functions ---

/**
 * Handles the image file upload, processing, and initial display.
 * @param {File} file - The image file selected by the user.
 */
function handleImageUpload(file) {
  if (!file || !file.type.startsWith("image/")) {
    alert("Please select a valid image file.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      originalImage = img; // Store the loaded image object

      // Extract the background color from the top-left pixel
      try {
        extractedColor = extractBackgroundColor(img);
      } catch (error) {
        console.error("Could not extract color, defaulting to black:", error);
        extractedColor = "#000000"; // Fallback
      }

      // Set initial padding color and update UI elements
      currentPaddingColor = extractedColor;
      colorPreview.style.backgroundColor = extractedColor;
      colorPicker.value = rgbToHex(extractedColor); // Update color picker to match

      // Draw the initial thumbnail
      redrawThumbnail();

      // Show download button and set its initial action
      downloadBtn.style.display = "inline-block"; // Use inline-block for proper layout
      updateDownloadLink(); // Set the initial download link

      // Check if the color picker value has been changed (it shouldn't have yet)
      toggleRestoreButtonVisibility(); // Should hide the button initially
    };
    img.onerror = function () {
      alert("Failed to load the image.");
      originalImage = null; // Reset if loading fails
    };
    img.src = e.target.result; // Start loading the image
  };

  reader.onerror = function () {
    alert("Failed to read the file.");
    originalImage = null; // Reset on read error
  };
  reader.readAsDataURL(file); // Read the file as a Data URL
}

/**
 * Extracts the background color from the top-left pixel of an image.
 * @param {HTMLImageElement} image - The image element to process.
 * @returns {string} - The color in RGB format (e.g., "rgb(255, 0, 0)").
 */
function extractBackgroundColor(image) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true }); // Optimization hint
  tempCanvas.width = 1; // Only need 1 pixel
  tempCanvas.height = 1;
  // Draw the top-left corner of the image onto the tiny canvas
  tempCtx.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);
  // Get the pixel data
  const pixel = tempCtx.getImageData(0, 0, 1, 1).data;
  // Return in CSS RGB format
  return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
}

/**
 * Redraws the thumbnail onto the main canvas with the current padding color
 * and updates the preview image element.
 */
function redrawThumbnail() {
  if (!originalImage) return; // Don't draw if there's no image

  const targetWidth = 1280;
  const targetHeight = 720;
  const targetAspect = targetWidth / targetHeight; // 16:9
  const imgAspect = originalImage.width / originalImage.height;

  let drawWidth, drawHeight, offsetX, offsetY;

  // Calculate dimensions and offsets for centering and padding
  if (imgAspect > targetAspect) {
    // Image is wider than 16:9 (needs vertical padding)
    drawWidth = targetWidth;
    drawHeight = targetWidth / imgAspect;
    offsetX = 0;
    offsetY = (targetHeight - drawHeight) / 2;
  } else if (imgAspect < targetAspect) {
    // Image is taller than 16:9 (needs horizontal padding)
    drawHeight = targetHeight;
    drawWidth = targetHeight * imgAspect;
    offsetY = 0;
    offsetX = (targetWidth - drawWidth) / 2;
  } else {
    // Image is exactly 16:9 (no padding needed)
    drawWidth = targetWidth;
    drawHeight = targetHeight;
    offsetX = 0;
    offsetY = 0;
  }

  // Set canvas dimensions
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Fill the entire canvas with the current padding color
  ctx.fillStyle = currentPaddingColor;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Draw the original image onto the canvas, centered, with calculated dimensions
  ctx.drawImage(originalImage, offsetX, offsetY, drawWidth, drawHeight);

  // Update the visible thumbnail image element's source
  try {
    const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.9); // Get data URL
    thumbnailImg.src = thumbnailUrl;
    thumbnailImg.style.display = "block"; // Make it visible
    updateDownloadLink(); // Update the download button's link
  } catch (error) {
    console.error("Error generating thumbnail data URL:", error);
    alert("Could not generate thumbnail preview.");
    thumbnailImg.style.display = "none"; // Hide if error
  }
}

/**
 * Updates the download button's click handler to download the current canvas content.
 */
function updateDownloadLink() {
  // Remove any existing event listeners first
  downloadBtn.removeEventListener("click", handleDownload);

  // Add the download event listener only once
  downloadBtn.addEventListener("click", handleDownload);
}

/**
 * Handle the actual download when the button is clicked.
 */
function handleDownload() {
  try {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const a = document.createElement("a");
    a.href = dataUrl;
    // Suggest a filename (e.g., thumbnail-1680x1050.jpg)
    const originalFileName =
      uploadInput.files[0]?.name.split(".")[0] || "image";
    a.download = `thumbnail-${originalFileName}.jpg`;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a); // Clean up
  } catch (error) {
    console.error("Failed to create download link:", error);
    alert("Could not prepare the image for download.");
  }
}

/**
 * Shows or hides the "Restore Original Color" button based on whether
 * the current color picker value matches the initially extracted color.
 */
function toggleRestoreButtonVisibility() {
  // Convert extracted RGB to Hex for comparison
  const extractedHex = rgbToHex(extractedColor);
  // Compare with current picker value
  if (colorPicker.value !== extractedHex) {
    restoreColorBtn.style.display = "inline-block"; // Show button
  } else {
    restoreColorBtn.style.display = "none"; // Hide button
  }
}

// --- Utility Functions ---

/**
 * Converts an RGB color string to its hexadecimal representation.
 * Handles "rgb(r, g, b)" format.
 * @param {string} rgb - The RGB color string.
 * @returns {string} - The hex color string (e.g., "#ff0000").
 */
function rgbToHex(rgb) {
  // Match numbers in the rgb string
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) {
    // Handle potential errors or unexpected formats
    console.warn("Invalid RGB format for hex conversion:", rgb);
    return "#000000"; // Default to black on error
  }
  // Convert each component to hex and pad with zero if needed
  const r = parseInt(result[0], 10).toString(16).padStart(2, "0");
  const g = parseInt(result[1], 10).toString(16).padStart(2, "0");
  const b = parseInt(result[2], 10).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
