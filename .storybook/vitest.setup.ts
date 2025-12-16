import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/react';
import * as projectAnnotations from './preview';

const project = setProjectAnnotations([projectAnnotations]);

beforeAll(project.beforeAll);

// Note: page.emulateMedia() for forced-colors is handled in the preVisit hook
// of test-runner.ts (for Storybook test-runner), not in the play functions of stories
// or in this vitest setup file. The vitest tests do not have forced-colors emulation.
