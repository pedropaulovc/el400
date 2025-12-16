import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/react';
import * as projectAnnotations from './preview';

const project = setProjectAnnotations([projectAnnotations]);

beforeAll(project.beforeAll);

// Note: page.emulateMedia() for forced-colors is now handled per-story
// in the play functions of forced-colors stories, using the page object
// available through Vitest browser mode with Playwright provider
