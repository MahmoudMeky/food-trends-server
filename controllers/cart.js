const CartModel = require("../models/Cart");
const productModel = require("../models/product");

const addCartItem = async(req,res)=>{
    try{
        // find the Cart items of the Customer
        // if Not Found
        //     Create new Cart and add the items in it
        //if the Customer already has cart collection
        //     then iterate over the items
        //        if the item not added before in the product array in the cart collection add it
        //        if already added just change the quantity of this item
        let customerCart = await CartModel.findOne({customer:req.user._id});
        // get the product to check number of in stock
        const product = await productModel.findById(req.body.product);

        if(!customerCart) {
            if(req.body.quantity > product.inStock) return res.status(400).send('Out of stock');
            const price = req.body.quantity * product.price;
            customerCart =  new CartModel({products:[req.body],customer:req.user._id,cartPrice:price});
            await customerCart.save();
            return res.status(201).send(customerCart);
        }

        const index = customerCart.products.findIndex( productObj => productObj.product.toString() === req.body.product);
        if(index === -1){
            if(req.quantity > product.inStock) return res.status(400).send('Out of stock');
            customerCart.products.push({...req.body});
        }
        else {
            if(customerCart.products[index].quantity + req.body.quantity > product.inStock) return res.status(400).send('Out of stock');
            customerCart.products[index].quantity+= req.body.quantity;
        }
        customerCart.cartPrice += req.body.quantity * product.price;

        await customerCart.save();
        res.send(customerCart);
    }catch (e){
        res.status(400).send("Error: " + e);
    }
}
const getAllCartItems = async (req,res)=> {
    try {
        const cart = await CartModel.findOne({customer: req.user._id});
        if (!cart) return res.status(404).send({});
        res.send(cart);
    } catch (e) {
        res.status(400).send('Error ' + e);
    }
}
const updateCart = async(req,res)=>{
    try{
        const customerCart = await CartModel.findOne({customer:req.user._id});
        const cartProduct = customerCart.products.find( product => product._id.toString() === req.body.id);
        const product = await productModel.findById(cartProduct.product);

        const validOpeation = req.body.quantity <= product.inStock;
        if(!validOpeation) return res.status(400).send('Out of stock !!');
        customerCart.cartPrice += (req.body.quantity - cartProduct.quantity) * product.price;
        cartProduct.quantity = req.body.quantity;

        await customerCart.save();
        res.send({cartProduct, cartPrice:customerCart.cartPrice});
    }catch (e){
        res.status(400).send('Error' + e);
    }
}
const deleteCartProduct = async (req,res)=>{
    try{
        const customerCart = await CartModel.findOne({customer:req.user._id});
        const indexRemove = customerCart.products.findIndex( cartItem => cartItem._id.toString() === req.body.id);
        const product = await productModel.findById(customerCart.products[indexRemove].product);
        customerCart.cartPrice -= customerCart.products[indexRemove].quantity * product.price;
        customerCart.products.splice(indexRemove,1);
        await customerCart.save();
        res.send({id: req.body.id});
    }catch (e){
        res.status(400).send(e.message);
    }
}
const putCartProducts = async(req,res)=>{
    try{
        const customerCart = await CartModel.findOne({customer:req.user._id});
        let  outOfStock = null;
        for(let cartProduct of req.body.products)
            if(!outOfStock){
                const product = await productModel.findById(cartProduct.product);
                console.log(cartProduct.quantity);
                console.log(product.inStock);
                if(cartProduct.quantity > product.inStock) outOfStock = cartProduct._id;
            }
        if(outOfStock) return res.status(400).send({message:'out of Stock', id:outOfStock});
        customerCart.products = req.body.products;
        customerCart.cartPrice = req.body.cartPrice;
        await customerCart.save();
        res.send(customerCart);
    }catch (e){
        res.status(400).send(e.message);
    }
}
module.exports = {
    getAllCartItems,
    updateCart,
    addCartItem,
    deleteCartProduct,
    putCartProducts
}
