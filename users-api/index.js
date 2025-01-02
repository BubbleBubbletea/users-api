const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Base route
app.get('/', (req, res) => {
  res.send('API is running!');
});

// Authenticate middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract Bearer token
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data) {
      console.error('Error verifying token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    req.user = data.user; // Attach user to request object
    next();
  } catch (err) {
    console.error('Unexpected error in token verification:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Groups route
app.get('/groups', async (req, res) => {
  try {
    const { data, error } = await supabase.from('groups').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Error fetching groups' });
  }
});

// Members routes
app.get('/members', async (req, res) => {
  const { groupId } = req.query;
  try {
    let query = supabase.from('members').select('*');
    if (groupId) query = query.eq('group_id', groupId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Error fetching members' });
  }
});

app.post('/members', async (req, res) => {
  const { name, major, email, introduction, courses, groupId } = req.body;
  try {
    const { data, error } = await supabase
      .from('members')
      .insert([{ name, major, email, introduction, courses, group_id: groupId }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ error: 'Error adding member' });
  }
});

app.delete('/members/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: 'Error deleting member' });
  }
});

// Users and profiles routes
app.get('/users/profiles', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*, user_profiles(*)');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'Error fetching user profiles' });
  }
});

app.post('/user_profiles', async (req, res) => {
  const { user_id, introduction, courses } = req.body;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{ user_id, introduction, courses }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Error creating profile:', err);
    res.status(500).json({ error: 'Error creating profile' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
