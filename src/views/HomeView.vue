<script setup>
import PhotoStack from '../components/PhotoStack.vue'
import LatestWorks from '../components/LatestWorks.vue'
import ContactCta from '../components/ContactCta.vue'
import { heroPhotos, latestProjects } from '../data/content'
</script>

<template>
  <section aria-label="Fotografías destacadas" data-nav-overlay>
    <h1 class="sr-only">Jorge de María, fotografía de arquitectura</h1>
    <PhotoStack :photos="heroPhotos" />
  </section>

  <LatestWorks v-if="latestProjects.length" :projects="latestProjects" />

  <ContactCta />
</template>
