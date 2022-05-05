const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

function verifyJWt(req,res,next){
    
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'unauthorized Access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
        if(err){
            return res.status(403).send({message: 'Forbidden Access'});
        }
        console.log('decoded', decoded);
        req.decoded =decoded;
    });
    next();
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dsgsp.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
        const itemCollection = client.db("ElectronicsInventory").collection("item");

        // Auth
        app.post('/login', async(req,res) =>{
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
                expiresIn: '1d'
            });
            res.send({accessToken});

        })



        // get items
        app.get('/myitem',verifyJWt, async(req,res)=>{
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if(email === decodedEmail){
                const query = {email:email};
                const cursor = itemCollection.find(query);
                const items = await cursor.toArray();
                res.send(items)
            }
            else{
                res.status(403).send({message:'Forbidden Access'})
            }
        })
        // get items
        app.get('/inventory', async(req,res)=>{
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items)
        })

        app.get('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: ObjectId(id) };
            const singleItem = await itemCollection.findOne(query);
            // console.log(query, singleItem)
            res.send(singleItem);
        });

        // POST ITem
        app.post('/inventory',async (req,res) =>{
            const newItem = req.body;
            const addItem = await itemCollection.insertOne(newItem);
            res.send(addItem);
        });

        // Item Update
        app.put('/inventory/:id', async(req,res) =>{
            const id = req.params.id;
            const updatedItem = req.body;
            console.log(updatedItem)
            const filter = {_id: ObjectId(id)};
            const options = {upsert: true};
            const updatedInfo = {
                $set: {
                    quantity: updatedItem.quantity,
                }
            };
            const updatedResult = await itemCollection.updateOne(filter, updatedInfo, options);
            res.send(updatedResult);
        })

        // Item Delete
        app.delete('/inventory/:id', async(req,res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const deleteItem = await itemCollection.deleteOne(query);
            res.send(deleteItem);
        });


    }finally{
        // await client.close();
    }
}

run().catch(console.dir)


app.get('/', (req,res) => {
    res.send("Hello World");
})

app.listen(port, ()=> {
    console.log("Listening port", port);
})