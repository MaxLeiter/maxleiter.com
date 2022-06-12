---
title: How to migrate to Vue 3
description: Everything I know on migrating from Vue 2 to Vue 3
slug: vue-3
date: June 7, 2022
---

I've recently been working on [migrating The Lounge](https://github.com/thelounge/thelounge/pull/4559) from Vue 2 to Vue 3 (and TypeScript, but that's for another post). The [official migration guide](https://v3-migration.vuejs.org/breaking-changes/) is good, but it only covers core Vue changes and I think I can share some more useful tips. 

## Vue

After a `yarn upgrade vue@latest` here's a reference of the changes I needed to make.


### The Composition API

In my opinion, switching to the composition API prepares is a major advantage. It potentially reduces your bundle size (as you don't need to support the options API), is easier to read, is more similar to React, and is the officially recommended API moving forward. 

I don't personally enjoy the `<script setup>` syntax Vue 3 offers. Instead, I prefer the syntax of `<script>` with `defineComponent`. The transition is simpler because of it's similarity to Vue 2 and tou explicitly list your props, children components, and events instead of relying on transformation magic.

Here's a basic component (in TypeScript, but converting to vanilla is fairly easy):
<details>
<summary>Component.vue (click to toggle)</summary>

```typescript
<template>
	<div>
		<CustomComponent 
		passwordChangeStatus={passwordChangeStatus} 
		session={currentSession} 
	/>
	</div>
</template>

<style scoped>
<!-- intentionally left blank -->
</style>

<script lang="ts">
import CustomComponent from "@/components/CustomComponent.vue";
import Session from "@/components/Session.vue";
import {computed, defineComponent, onMounted, PropType, ref} from "vue";
import {useStore} from "@/hooks/use-store";

export default defineComponent({
	name: "CustomComponentWrapper",
	
	// Label child components
	components: {
		CustomComponent,
	},
	
	// Define props
	props: {
		form: {
			// if you use vanilla JavaScript you're limited to 
			// typing props with native constructors (Object, Number, etc).
			type: Object as PropType<HTMLFormElement>,
			required: true,
		},
	},
	
	// Declare emitted events for parent events to listen to via 
	// <CustomComponentWrapper
	// 		@sessions={}
	// />

	emits: ["sessions],
	setup(props, { emit }) {
		const store = useStore();

		const passwordChangeStatus = ref<{
			success: boolean;
			error: keyof typeof passwordErrors;
		}>();

		const currentSession = computed(() => {
			return store.state.sessions.find((item) => item.current);
		});

		onMounted(() => {
			emit("sessions");
		});

		return {
			store,
			currentSession,
			passwordChangeStatus
		};
	},
});
</script>
```

</details>

You may notice that the name, components, and props are all also valid in Vue 2. What's new here are `setup()` function and the `emits` array.

The setup function looks like this: `setup(props, { attrs, slots, emit, expose })`. I won't cover `slots` and `attrs`, but `emit` is described below.




#### Emitting events
 is a function that lets you emit one of the events defined in the parent `emits` (`string[]`) array. You can use it `setup` simply by calling it with the name and any data like so:

```javascript
<script>
...
emits: ["demo"],
setup(props, { emit }) {
	const data = reactive(0);
	emit("demo", { 
		// note that if you used `ref` instead of `reactive` 
		/ above you'd need to unwrap data by calling 
		// `data.value` instead of `data` below.
		value: data
	})
	
	return data;
}
...
</script>
```

In your component you can emit events (say, when a button is clicked) by using `$emit`:

**Child:**

```html
<template>
	<button
		@click.stop="$emit('clicked')"
	>
		Click me to emit an event
	</button>
</template>

<script>
...
</script>
```

**Parent:**

```html
<template>
	<CustomComponent @clicked={console.log} />
</template>
```





