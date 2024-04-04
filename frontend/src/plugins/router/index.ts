import { useTitle } from '@vueuse/core';
import { computed, watch } from 'vue';
import {
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router';
import type { RouteNamedMap, _RouterTyped } from 'unplugin-vue-router/types';
import { remote } from '../remote';
import { adminGuard } from './middlewares/admin-pages';
import { loginGuard } from './middlewares/login';
import { metaGuard } from './middlewares/meta';
import { validateGuard } from './middlewares/validate';
import { isStr } from '@/utils/validation';
import { getJSONConfig } from '@/utils/external-config';

export const router = createRouter({
  history:
    (await getJSONConfig()).routerMode === 'history'
      ? createWebHistory()
      : createWebHashHistory(),
  routes: [],
  /**
   * TODO: Fix this, so it only scrolls to the top once suspense resolves
   */
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 };
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error - Wait for upstream fix for https://github.com/posva/unplugin-vue-router/pull/157
}) as _RouterTyped<RouteNamedMap>;

/**
 * Middleware pipeline: The order IS IMPORTANT (meta handling should always go last)
 *
 * Route-specific guards should be defined in the route itself, not here.
 */
router.beforeEach(loginGuard);
router.beforeEach(adminGuard);
router.beforeEach(validateGuard);
router.beforeEach(metaGuard);

/**
 * Replaces the 'back' function, taking into account if there's a previous page or not.
 * If there's no previous page in history, we ensure we want to go home
 */
const backTransition = 'slide-x';

router.back = (): ReturnType<typeof router.back> => {
  const route = router.currentRoute;

  /**
   * Play the same transition we do at RouterViewTransition.vue (slide-x-reverse-transition)
   * but reversed, to play a different effect when going to the previous page.
   */
  if (!route.value.meta.transition) {
    route.value.meta.transition = {
      enter: 'slide-x-reverse',
      leave: backTransition
    };
  } else if (!route.value.meta.transition.leave) {
    route.value.meta.transition.leave = backTransition;
  }

  void router.replace(
    isStr(router.options.history.state.back)
      ? router.options.history.state.back
      : '/'
  );
};

/**
 * Handle page title changes
 */
const pageTitle = computed(() => {
  const title = router.currentRoute.value.meta.title?.trim();

  return title ? `${title} | Jellyfin Vue` : 'Jellyfin Vue';
});

useTitle(pageTitle);

/**
 * Re-run the middleware pipeline when the user logs out or state is cleared
 */
watch(
  [
    (): typeof remote.auth.currentUser => remote.auth.currentUser,
    (): typeof remote.auth.servers => remote.auth.servers
  ],
  async () => {
    if (!remote.auth.currentUser && remote.auth.servers.length <= 0) {
      /**
       * We run the redirect to /server/add as it's the first page in the login flow
       *
       * In case the whole localStorage is gone at runtime, if we're at the login
       * page, redirecting to /server/login wouldn't work, as we're in that same page.
       * /server/add doesn't depend on the state of localStorage, so it's always safe to
       * redirect there and leave the middleware take care of the final destination
       * (when servers are already available, for example)
       */
      await router.replace('/server/add');
    } else if (
      !remote.auth.currentUser &&
      remote.auth.servers.length > 0 &&
      remote.auth.currentServer
    ) {
      await (remote.auth.currentServer.StartupWizardCompleted ? router.replace('/server/login') : router.replace('/wizard'));
    } else if (
      !remote.auth.currentUser &&
      remote.auth.servers.length > 0 &&
      !remote.auth.currentServer
    ) {
      await router.replace('/server/select');
    }
  }
);
