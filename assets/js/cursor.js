/**
 * Nebula - Custom Cursor [DISABLED]
 * This file is now disabled as custom cursor has been removed.
 */

// Custom cursor functionality has been disabled
// If you want to re-enable it, restore the original code

// Initialize custom cursor when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Remove cursor elements if they exist
  document.querySelector('.cursor-dot')?.remove();
  document.querySelector('.cursor-outline')?.remove();
});