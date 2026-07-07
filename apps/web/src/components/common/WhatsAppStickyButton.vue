<template>
  <a
    :href="whatsAppUrl"
    class="whatsapp-sticky-button"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat on WhatsApp at 01735494275"
  >
    <span class="whatsapp-sticky-button__icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" role="img" focusable="false">
        <path
          fill="currentColor"
          d="M19.11 17.27c-.29-.14-1.69-.83-1.95-.92-.26-.1-.45-.14-.64.15-.19.29-.74.92-.9 1.11-.17.19-.33.22-.62.08-.29-.15-1.22-.45-2.33-1.43-.86-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.59.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.48h-.55c-.19 0-.5.07-.76.36-.26.29-1 1-.98 2.43.02 1.43 1.03 2.81 1.17 3 .14.19 2.01 3.07 4.86 4.3.68.29 1.21.46 1.62.59.68.22 1.29.19 1.77.12.54-.08 1.69-.69 1.93-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33Z"
        />
        <path
          fill="currentColor"
          d="M16.02 3.2c-7.03 0-12.74 5.7-12.74 12.7 0 2.24.59 4.43 1.71 6.35L3.2 28.8l6.72-1.76a12.79 12.79 0 0 0 6.1 1.55h.01c7.02 0 12.77-5.7 12.77-12.7 0-3.39-1.32-6.58-3.72-8.98A12.72 12.72 0 0 0 16.02 3.2Zm0 23.24h-.01a10.63 10.63 0 0 1-5.41-1.48l-.39-.23-3.99 1.05 1.07-3.88-.26-.4a10.52 10.52 0 0 1-1.63-5.59c0-5.83 4.76-10.58 10.62-10.58 2.84 0 5.51 1.1 7.51 3.09a10.5 10.5 0 0 1 3.1 7.48c0 5.83-4.78 10.56-10.61 10.56Z"
        />
      </svg>
    </span>
    <span class="whatsapp-sticky-button__text">
      <strong>WhatsApp</strong>
      <span>01735494275</span>
    </span>
  </a>
</template>

<script setup lang="ts">
const whatsAppUrl = 'https://wa.me/8801735494275';
</script>

<style scoped>
.whatsapp-sticky-button {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 80;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #25d366 0%, #1faa52 100%);
  color: #fff;
  padding: 0.9rem 1.15rem 0.9rem 0.9rem;
  box-shadow: 0 18px 40px rgba(20, 122, 52, 0.26);
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.whatsapp-sticky-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 44px rgba(20, 122, 52, 0.32);
}

.whatsapp-sticky-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.whatsapp-sticky-button__icon svg {
  width: 1.55rem;
  height: 1.55rem;
}

.whatsapp-sticky-button__text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.whatsapp-sticky-button__text strong {
  font-size: 0.9rem;
  font-weight: 800;
}

.whatsapp-sticky-button__text span {
  font-size: 0.82rem;
  opacity: 0.95;
}

@media (max-width: 640px) {
  .whatsapp-sticky-button {
    right: 0.75rem;
    bottom: 0.75rem;
    padding-right: 1rem;
  }

  .whatsapp-sticky-button__text {
    display: none;
  }
}
</style>
