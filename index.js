const express = require('express')
const fs = require('fs')
const cors = require('cors')
const jwt = require('jsonwebtoken')

const secretKey = process.env.envKey

// Middleware JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) {
        return res.sendStatus(401)
    } 

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.sendStatus(403)
        } 
        req.user = user
        next()
    });
}

// Vérification du nom
function isValidName(name) {
    return typeof name === 'string' && name.trim().length > 0;
}

// Vérification du score
function isValidScore(score) {
    return Number.isInteger(score) && score >= 0 && score <= 100000; // Exemple de validation
}

const app = express()
const port = process.env.PORT || 3000
const SCORES_FILE = 'scores.json'

const allowedOrigins = ['https://elrias.github.io']

const corsOptions = {
    origin: function (origin, callback) {
        console.log('Origin:', origin); // Log de l'origine pour le debugging
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true)
        }
        else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}

// Middleware CORS
app.use(cors(corsOptions)) // autorise les requêtes provenant de domaines différents

// Middleware pour parser le corps des requêtes en JSON
app.use(express.json())

// Route pour obtenir le token JWT statique
app.get('/api/token', (req, res) => {
    console.log('Sending token.')
    const payload = { app: 'canvasShooter' }
    try {
      const token = jwt.sign(payload, secretKey, { expiresIn: '5s' })
      res.json({ token })
    } catch(error) {
      console.error('Error generating token:', error)
      res.status(500).json({ error: 'Error generating token'})
    }
      
})

app.get('/',(req, res) => {
  res.send('Welcome to my API !')
})

// Endpoint pour enregistrer les scores
app.post('/api/scores', authenticateToken, (req, res) => {
    const newScore = req.body
    console.log('Received new score:', newScore)
  
    if(!isValidScore(newScore.score)) {
      return res.status(400).json({ error: 'Score is invalid' })
    }
  
    if (!isValidName(newScore.name)) {
        return res.status(400).json({ error: 'Name is invalid.' })
    }
    
    // Lire les scores existants
    fs.readFile(SCORES_FILE, 'utf8', (err, data) => {
        if(err) {
            if(err.code === 'ENOENT') {
                // Si le fichier n'existe pas, initialiser avec un tableau vide
                data = '[]'
            }
            else {
                console.error('Error reading file:', err)
                return res.status(500).json({ error: 'Internal Server Error'})
            }
        }

        let scores
        try {
            scores = JSON.parse(data)
        } catch (parseError) {
            console.error('Error parsing JSON:',parseError)
            scores = []
        }

        scores.push(newScore)

        // Ecrire les scores mis à jour
        fs.writeFile(SCORES_FILE, JSON.stringify(scores, null, 2), (writeErr) => {
            if(writeErr) {
                console.error('Error writing file:', writeErr)
                return res.status(500).json({ error: 'Internal Server Error'})
            }

            console.log('Score saved successfully:', newScore)
            res.status(200).json({ message: 'Score saved successfully' })
        })
    })
})

// Endpoint pour récupérer les scores
app.get('/api/scores', (req, res) => {
    fs.readFile(SCORES_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(200).json([])
            }
            else {
                console.error('Error reading file:', err)
                return res.status(500).json({ error: 'Internal Server Error'})
            }
        }
    
        let scores
        try {
            scores = JSON.parse(data)
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError)
            scores = []
        }

        res.status(200).json(scores)
    })
})

// Endpoint pour mettre à jour un score
app.put('/api/scores/:index', authenticateToken, (req, res) => {
    const scoreIndex = parseInt(req.params.index, 10)
    const updatedScore = req.body

    if(!isValidScore(updatedScore.score)) {
      return res.status(400).json({ error: 'Score is invalid' })
    }
  
    if (!isValidName(updatedScore.name)) {
        return res.status(400).json({ error: 'Name is invalid.' })
    }
    
    fs.readFile(SCORES_FILE, 'utf-8', (err, data) => {
        if (err) {
            console.error('Error reading file', err)
            return res.status(500).json({ error: 'Internal Server Error' })
        }

        let scores = []
        try {
            scores = JSON.parse(data);
        } catch (parseError) {
            console.error('Error parsing JSON', parseError)
            return res.status(500).json({ error: 'Internal Server Error' })
        }

        if (scoreIndex < 0 || scoreIndex >= scores.length) {
            return res.status(404).json({ error: 'Score not found' })
        }

        scores[scoreIndex] = updatedScore

        fs.writeFile(SCORES_FILE, JSON.stringify(scores, null, 2), (writeErr) => {
            if(writeErr) {
                console.error('Error writing file:', writeErr)
                return res.status(500).json({ error: 'Internal Server Error' })
            }

            console.log('Score updated successfully', updatedScore)
            res.status(200).json({ message: 'Score updated successfully', score: updatedScore})
        })
    })
})

app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`)
})