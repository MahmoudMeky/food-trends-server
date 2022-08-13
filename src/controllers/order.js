const {createPayment} = require('../payment/createPayment');
const orderModel = require("../models/Order");
const cartModel = require("../models/Cart");
// Get all Customer Order
const getAllOrders = async (req, res) => {
  try{
    let sort = {};
    if(req.query.sortBy){
      const partsOfSort = req.query.sortBy.split(':');
      sort[partsOfSort[0]] = partsOfSort[1] === 'desc'?-1:1;
    }
    else sort = {"createdAt":-1};
    const filterObj = {};
    if(req.query.status)
      filterObj.status = req.query.status;
    filterObj.customer = req.user._id;

    const count = await  orderModel.find(filterObj).count();
    const customerOrders = await orderModel.find(filterObj,null,{sort}).populate('products.product');
    if(!customerOrders) return res.status(404).send({error:'orders not found',code:404});
    return res.send({data:customerOrders,count});
  }catch (e){
    res.status(400).send({error:e.message,code:400});
  }
}
// Create Order by array of product objects from cart collection
const createOrder = async (req, res) => {
  try {
    const customerCart = await cartModel.findOne({customer:req.user._id}).populate('products.product');
    if(!customerCart)
      return res.status(400).send({error:'Invalid Operation checkout list should not be empty',code:400});
    const productsOrder = customerCart.products;
    // check the in stock Instances for each product
    let outOfStockProduct;
    productsOrder.forEach( item=>{
      if(!outOfStockProduct &&
          item.product.inStock < item.quantity) outOfStockProduct = item.product.productName;
    });
    if(outOfStockProduct)
      return res.status(400).send({error:'out of stock', productName:outOfStockProduct,code:400});
    const makeOrderRes = await createPayment(productsOrder,req.body.url);
    if(makeOrderRes.error) throw new Error(makeOrderRes.error);
    res.send(makeOrderRes);
  } catch (e) {
    res.status(400).send({error:e.message,code:400});
  }
}
const saveOrder = async (req,res)=>{
  try {
    const customerCart = await cartModel.findOne({customer: req.user._id}).populate('products.product');
    const productsOrder = customerCart.products;
    const orderObj = productsOrder.map(item => ({product: item.product._id, quantity: item.quantity}));
    const Order = new orderModel({products: orderObj, customer: req.user._id, totalPrice: customerCart.cartPrice});
    await Order.save();
    res.send();
  }catch(e){
    res.status(400).send({error:e.message,code:400});
  }
  // post save Order Update product in stock instances
  // post Save remove the order product from the cart
  // res.send(productsOrder);
}
// Cancel the Order if the status is Pending
const cancelOrder = async (req,res)=>{
  try{
    const order = await orderModel.findOne({_id:req.params.id, customer:req.user._id});
    if(!order) return res.status(404).send({error:'order not found',code:404});
    if(order.status !== 'pending') return res.status(400).send('Invalid Operation: can not cancel this Order');
    // pre remove add the in stock instances
    await order.remove();
    res.send(order);
  }catch (e){
    res.status(400).send({error:e.message,code:400});
  }
}


module.exports = {
  getAllOrders,
  createOrder,
  cancelOrder,
  saveOrder
}
