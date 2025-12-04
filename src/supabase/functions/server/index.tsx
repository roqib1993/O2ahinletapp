import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Get all calibration sessions
app.get('/make-server-e669e2e2/sessions', async (c) => {
  try {
    const sessions = await kv.getByPrefix('session:');
    return c.json({ success: true, sessions });
  } catch (error) {
    console.log(`Error fetching sessions: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create a new calibration session
app.post('/make-server-e669e2e2/sessions', async (c) => {
  try {
    const session = await c.req.json();
    const key = `session:${session.id}`;
    await kv.set(key, session);
    return c.json({ success: true, session });
  } catch (error) {
    console.log(`Error creating session: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update an existing calibration session
app.put('/make-server-e669e2e2/sessions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const session = await c.req.json();
    const key = `session:${id}`;
    await kv.set(key, session);
    return c.json({ success: true, session });
  } catch (error) {
    console.log(`Error updating session with id ${c.req.param('id')}: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete a calibration session
app.delete('/make-server-e669e2e2/sessions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const key = `session:${id}`;
    await kv.del(key);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting session with id ${c.req.param('id')}: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);