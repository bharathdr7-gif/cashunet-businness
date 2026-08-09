import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function money(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}

function Login({ onLogin }) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  async function sendOtp(e) {
    e.preventDefault();
    try {
      const result = await api("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ mobile }),
      });
      setSent(true);
      setMessage(`Demo OTP: ${result.demo_otp}`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function verify(e) {
    e.preventDefault();
    try {
      await api("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ mobile, otp }),
      });
      localStorage.setItem("mobile", mobile);
      onLogin(mobile);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-icon">🥜</div>
        <h1>Cashew Store</h1>
        <p>Premium cashews delivered to your door.</p>

        {!sent ? (
          <form onSubmit={sendOtp}>
            <label>Mobile number</label>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter mobile number"
              maxLength="15"
              required
            />
            <button>Send OTP</button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <label>Enter OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
            />
            <button>Login</button>
            <button type="button" className="secondary" onClick={() => setSent(false)}>
              Change number
            </button>
          </form>
        )}

        {message && <div className="notice">{message}</div>}
      </div>
    </div>
  );
}

function Header({ cartCount, page, setPage, logout }) {
  return (
    <header>
      <div className="container nav">
        <button className="logo" onClick={() => setPage("home")}>🥜 Cashew Store</button>
        <nav>
          <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>Home</button>
          <button className={page === "orders" ? "active" : ""} onClick={() => setPage("orders")}>My Orders</button>
          <button className="cart-btn" onClick={() => setPage("cart")}>🛒 Cart ({cartCount})</button>
          <button onClick={logout}>Logout</button>
        </nav>
      </div>
    </header>
  );
}

function ProductCard({ product, addToCart }) {
  return (
    <article className="product-card">
      <img src={product.image} alt={product.name} />
      <div className="product-body">
        <span className="tag">{product.weight}</span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-footer">
          <strong>{money(product.price)}</strong>
          <button onClick={() => addToCart(product)}>Add</button>
        </div>
        <small>{product.stock} in stock</small>
      </div>
    </article>
  );
}

function Home({ products, addToCart }) {
  return (
    <main className="container">
      <section className="hero">
        <div>
          <span className="eyebrow">100% premium quality</span>
          <h1>Fresh, crunchy cashews for every occasion.</h1>
          <p>Choose your favourite pack and get it delivered to your doorstep.</p>
        </div>
        <div className="hero-nut">🥜</div>
      </section>

      <section>
        <div className="section-heading">
          <h2>Our Cashews</h2>
          <span>{products.length} products</span>
        </div>
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} addToCart={addToCart} />)}
        </div>
      </section>
    </main>
  );
}

function Cart({ cart, updateQty, remove, checkout }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!cart.length) {
    return <main className="container empty"><h2>Your cart is empty 🛒</h2><p>Add some delicious cashews first.</p></main>;
  }

  return (
    <main className="container">
      <h2>Shopping Cart</h2>
      <div className="cart-layout">
        <div>
          {cart.map((item) => (
            <div className="cart-item" key={item.id}>
              <img src={item.image} alt={item.name} />
              <div className="cart-info">
                <h3>{item.name}</h3>
                <span>{item.weight}</span>
                <strong>{money(item.price)}</strong>
              </div>
              <div className="quantity">
                <button onClick={() => updateQty(item.id, item.quantity - 1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
              </div>
              <button className="remove" onClick={() => remove(item.id)}>Remove</button>
            </div>
          ))}
        </div>

        <aside className="summary">
          <h3>Order Summary</h3>
          <div><span>Subtotal</span><strong>{money(total)}</strong></div>
          <div><span>Delivery</span><strong>FREE</strong></div>
          <hr />
          <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
          <button onClick={checkout}>Proceed to Checkout</button>
        </aside>
      </div>
    </main>
  );
}

function Checkout({ cart, mobile, onSuccess, onBack }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [form, setForm] = useState({
    name: "",
    mobile,
    address_line: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [error, setError] = useState("");

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function placeOrder(e) {
    e.preventDefault();
    try {
      const order = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          mobile,
          items: cart.map((x) => ({ product_id: x.id, quantity: x.quantity })),
          address: form,
          payment_method: "COD",
        }),
      });
      onSuccess(order);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="container checkout">
      <button className="back" onClick={onBack}>← Back to cart</button>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={placeOrder}>
          <h2>Delivery Details</h2>
          <input name="name" placeholder="Full name" onChange={change} required />
          <input name="mobile" value={form.mobile} placeholder="Mobile number" onChange={change} required />
          <textarea name="address_line" placeholder="House / street / area" onChange={change} required />
          <div className="two">
            <input name="city" placeholder="City" onChange={change} required />
            <input name="state" placeholder="State" onChange={change} required />
          </div>
          <input name="pincode" placeholder="PIN code" maxLength="6" onChange={change} required />
          <div className="payment-option">💵 Cash on Delivery</div>
          {error && <div className="error">{error}</div>}
          <button>Place Order — {money(total)}</button>
        </form>
      </div>
    </main>
  );
}

function Orders({ mobile }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api(`/orders/${mobile}`).then(setOrders).catch(console.error);
  }, [mobile]);

  return (
    <main className="container">
      <h2>My Orders</h2>
      {!orders.length && <div className="empty"><p>No orders yet.</p></div>}
      <div className="orders">
        {orders.map((order) => (
          <div className="order-card" key={order.id}>
            <div className="order-top">
              <strong>Order #{order.id.slice(-6).toUpperCase()}</strong>
              <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
            </div>
            {order.items.map((item) => (
              <div className="order-line" key={item.product_id}>
                <span>{item.name} × {item.quantity}</span>
                <strong>{money(item.line_total)}</strong>
              </div>
            ))}
            <div className="order-total">Total: {money(order.total)}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

function App() {
  const [mobile, setMobile] = useState(localStorage.getItem("mobile") || "");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [page, setPage] = useState("home");
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    if (mobile) api("/products").then(setProducts).catch(console.error);
  }, [mobile]);

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((x) => x.id === product.id);
      if (existing) {
        return current.map((x) =>
          x.id === product.id ? { ...x, quantity: x.quantity + 1 } : x
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function updateQty(id, quantity) {
    if (quantity <= 0) {
      setCart((c) => c.filter((x) => x.id !== id));
      return;
    }
    setCart((c) => c.map((x) => x.id === id ? { ...x, quantity } : x));
  }

  function logout() {
    localStorage.removeItem("mobile");
    setMobile("");
    setCart([]);
  }

  if (!mobile) return <Login onLogin={setMobile} />;

  if (lastOrder) {
    return (
      <div className="success-page">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>Order placed!</h1>
          <p>Your order #{lastOrder.id.slice(-6).toUpperCase()} has been received.</p>
          <strong>Total: {money(lastOrder.total)}</strong>
          <button onClick={() => { setLastOrder(null); setCart([]); setPage("orders"); }}>View My Orders</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        cartCount={cart.reduce((s, x) => s + x.quantity, 0)}
        page={page}
        setPage={setPage}
        logout={logout}
      />
      {page === "home" && <Home products={products} addToCart={addToCart} />}
      {page === "cart" && <Cart cart={cart} updateQty={updateQty} remove={(id) => updateQty(id, 0)} checkout={() => setPage("checkout")} />}
      {page === "checkout" && <Checkout cart={cart} mobile={mobile} onBack={() => setPage("cart")} onSuccess={setLastOrder} />}
      {page === "orders" && <Orders mobile={mobile} />}
      <footer>© 2026 Cashew Store · Premium cashews</footer>
    </>
  );
}

export default App;
