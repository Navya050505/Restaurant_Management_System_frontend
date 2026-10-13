import { useEffect, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/restaurants'
const ADMIN_API = API.replace(/\/restaurants\/?$/, '/admin')
const TOKEN_KEY = 'restaurant_admin_token'

function App() {
  const [items, setItems] = useState([])
  const [cart, setCart] = useState([])
  const [page, setPage] = useState('customer')
  const [admin, setAdmin] = useState(false)
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [editId, setEditId] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadItems() {
    try {
      const response = await fetch(API)
      if (!response.ok) throw new Error()
      setItems(await response.json())
      setMessage('')
    } catch {
      setMessage('Cannot connect to the backend. Check that port 8080 is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  function addToCart(item) {
    setCart(old => {
      const found = old.find(row => row.id === item.id)
      if (found) {
        return old.map(row => row.id === item.id
          ? { ...row, quantity: row.quantity + 1 }
          : row)
      }
      return [...old, { ...item, quantity: 1 }]
    })
  }

  function changeQuantity(id, amount) {
    setCart(old => old
      .map(row => row.id === id
        ? { ...row, quantity: row.quantity + amount }
        : row)
      .filter(row => row.quantity > 0))
  }

  const total = cart.reduce(
    (sum, row) => sum + Number(row.price) * row.quantity, 0
  )

  async function login(e) {
    e.preventDefault()
    setMessage('')

    try {
      const response = await fetch(`${ADMIN_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (!response.ok) {
        setMessage('Incorrect admin password. Please try again.')
        return
      }

      const data = await response.json()
      setToken(data.token)
      sessionStorage.setItem(TOKEN_KEY, data.token)
      setAdmin(true)
      setPassword('')
      setPage('admin')
      setMessage('Admin login successful.')
    } catch {
      setMessage('Cannot reach the backend. Check that port 8080 is running.')
    }
  }

  async function saveItem(e) {
    e.preventDefault()
    setMessage('')

    try {
      const response = await fetch(
        editId ? `${API}/${editId}` : API,
        {
          method: editId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            category,
            price: Number(price)
          })
        }
      )

      if (response.status === 401) {
        logout()
        setMessage('Your admin session expired. Please log in again.')
        return
      }
      if (!response.ok) throw new Error()

      setName('')
      setCategory('')
      setPrice('')
      setEditId(null)
      setMessage('Menu item saved successfully.')
      await loadItems()
    } catch {
      setMessage('Could not save the item. Please check the backend.')
    }
  }

  async function deleteItem(id) {
    if (!window.confirm('Remove this food item from the menu?')) return

    try {
      const response = await fetch(`${API}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.status === 401) {
        logout()
        setMessage('Your admin session expired. Please log in again.')
        return
      }
      if (!response.ok) throw new Error()

      setCart(old => old.filter(row => row.id !== id))
      setMessage('Food item removed.')
      await loadItems()
    } catch {
      setMessage('Could not delete the item.')
    }
  }

  function startEdit(item) {
    setEditId(item.id)
    setName(item.name)
    setCategory(item.category)
    setPrice(String(item.price))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function logout() {
    const currentToken = token || sessionStorage.getItem(TOKEN_KEY)

    try {
      if (currentToken) {
        await fetch(`${ADMIN_API}/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` }
        })
      }
    } catch {
      // Clear the local session even if the server is unavailable.
    }

    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setAdmin(false)
    setPassword('')
    setPage('customer')
    setName('')
    setCategory('')
    setPrice('')
    setEditId(null)
    setMessage('Logged out.')
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">RESTAURANT MANAGEMENT SYSTEM</p>
        <h1>Good food. Great business.</h1>
        <p>Explore the menu, choose your favourites, and enjoy!</p>
        <nav className="nav">
          <button onClick={() => { setPage('customer'); setMessage('') }}>
            Customer Menu
          </button>
          <button className="secondary" onClick={() => {
            setPage(admin ? 'admin' : 'login')
            setMessage('')
          }}>
            {admin ? 'Admin Dashboard' : 'Admin Login'}
          </button>
        </nav>
      </header>

      {message && <p className="notice">{message}</p>}

      {page === 'customer' && (
        <>
          <section className="section-title">
            <div>
              <h2>Today's Menu</h2>
              <p>Select dishes to add them to your cart.</p>
            </div>
            <button className="secondary" onClick={loadItems}>Refresh Menu</button>
          </section>

          {loading ? <p>Loading menu...</p> : (
            <section className="food-grid">
              {items.map(item => (
                <article className="food-card" key={item.id}>
                  <div className="food-icon">🍽️</div>
                  <p className="category">{item.category}</p>
                  <h3>{item.name}</h3>
                  <p className="price">₹{Number(item.price).toFixed(2)}</p>
                  <button onClick={() => addToCart(item)}>Add to Cart +</button>
                </article>
              ))}
              {items.length === 0 && <p>No food items available yet.</p>}
            </section>
          )}

          <section className="panel cart-panel">
            <div className="section-title">
              <div>
                <h2>Your Cart</h2>
                <p>{cart.reduce((sum, row) => sum + row.quantity, 0)} item(s) selected</p>
              </div>
              <button className="secondary" onClick={() => setCart([])}>Clear Cart</button>
            </div>

            {cart.length === 0 ? <p className="empty">Your cart is empty. Add some delicious food!</p> : (
              <>
                {cart.map(row => (
                  <div className="cart-row" key={row.id}>
                    <div>
                      <strong>{row.name}</strong>
                      <p>₹{Number(row.price).toFixed(2)} each</p>
                    </div>
                    <div className="quantity">
                      <button className="secondary" onClick={() => changeQuantity(row.id, -1)}>-</button>
                      <strong>{row.quantity}</strong>
                      <button className="secondary" onClick={() => changeQuantity(row.id, 1)}>+</button>
                    </div>
                    <strong>₹{(Number(row.price) * row.quantity).toFixed(2)}</strong>
                  </div>
                ))}
                <div className="total">
                  <span>Total bill</span>
                  <strong>₹{total.toFixed(2)}</strong>
                </div>
                <button className="order-button" onClick={() => setMessage('Your cart is ready. Actual order submission is not enabled yet.')}>
                  Place Order
                </button>
              </>
            )}
          </section>
        </>
      )}

      {page === 'login' && (
        <section className="panel login-panel">
          <h2>🔐 Admin Login</h2>
          <p>Only authorised restaurant staff can manage the menu.</p>
          <form onSubmit={login} className="admin-form">
            <label>
              Admin password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </label>
            <button type="submit">Login</button>
          </form>
        </section>
      )}

      {page === 'admin' && admin && (
        <>
          <section className="panel">
            <div className="section-title">
              <div>
                <h2>Manage Food Menu</h2>
                <p>Add, edit, and delete menu items.</p>
              </div>
              <button className="secondary" onClick={logout}>Logout</button>
            </div>
            <form onSubmit={saveItem} className="menu-form">
              <label>Food name
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Food item name" />
              </label>
              <label>Category
                <input value={category} onChange={e => setCategory(e.target.value)} required placeholder="e.g. Main Course" />
              </label>
              <label>Price (₹)
                <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required placeholder="Price" />
              </label>
              <div className="form-actions">
                <button type="submit">{editId ? 'Update Item' : 'Add Item'}</button>
                {editId && (
                  <button type="button" className="secondary" onClick={() => {
                    setEditId(null)
                    setName('')
                    setCategory('')
                    setPrice('')
                  }}>Cancel</button>
                )}
              </div>
            </form>
          </section>

          <section className="panel">
            <h2>Existing Menu Items</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Food</th><th>Category</th><th>Price</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>₹{Number(item.price).toFixed(2)}</td>
                      <td className="actions">
                        <button className="secondary" onClick={() => startEdit(item)}>Edit</button>
                        <button className="danger" onClick={() => deleteItem(item.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <footer>Restaurant Management System · React · Spring Boot · MySQL</footer>
    </main>
  )
}

export default App