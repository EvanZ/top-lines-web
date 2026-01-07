<script setup>
import { computed, ref } from 'vue'
import { toPng } from 'html-to-image'

const props = defineProps({
  target: { type: [Object], default: null }, // HTMLElement, component instance, or ref
  filename: { type: String, default: 'card.png' },
  ariaLabel: { type: String, default: 'Download' },
  title: { type: String, default: 'Download' },
})

const downloading = ref(false)

const resolvedTarget = computed(() => {
  const t = props.target
  if (!t) return null
  if (t instanceof HTMLElement) return t
  if (t?.$el instanceof HTMLElement) return t.$el
  if (t?.value) {
    if (t.value instanceof HTMLElement) return t.value
    if (t.value?.$el instanceof HTMLElement) return t.value.$el
  }
  return null
})

const handleClick = async () => {
  if (downloading.value) return
  const el = resolvedTarget.value
  if (!el) return
  downloading.value = true
  try {
    const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = props.filename || 'card.png'
    link.click()
  } catch (err) {
    console.error('Card download failed', err)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <button
    class="download-btn-inline"
    type="button"
    :disabled="downloading"
    :aria-label="ariaLabel || title"
    :title="title"
    @click.stop.prevent="handleClick"
  >
  png<br>
  &#8595;
  </button>
</template>
