import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReceipt,
  deleteReceipt,
  listReceipts,
  scanReceipt,
  updateReceipt,
} from "../services/ReceiptService";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "../services/UserService";
import { API_BASE_URL } from "../services/api";
import type { Receipt, ReceiptFilters } from "../types/receipt.types";
import type { User } from "../types/user.types";

const emptyReceiptJson = JSON.stringify(
  {
    storeName: "Sample Store",
    purchaseDateTime: "2026-03-09T10:00:00Z",
    total: 12.34,
    currency: "USD",
    items: [],
  },
  null,
  2,
);

const emptyUserJson = JSON.stringify(
  {
    name: "Example User",
    email: "user@example.com",
  },
  null,
  2,
);

const emptyReceiptFilters = {
  id: "",
  include: "",
  exclude: "",
  minPrice: "",
  maxPrice: "",
};

type ReceiptFilterState = typeof emptyReceiptFilters;

type RequestState<T> = {
  data: T;
  error: string | null;
  loading: boolean;
};

const buildFilters = (filters: ReceiptFilterState): ReceiptFilters => {
  const trimmedId = filters.id.trim();
  const trimmedInclude = filters.include.trim();
  const trimmedExclude = filters.exclude.trim();
  const hasMin = filters.minPrice.trim().length > 0;
  const hasMax = filters.maxPrice.trim().length > 0;

  return {
    ...(trimmedId ? { id: trimmedId } : {}),
    ...(trimmedInclude ? { include: trimmedInclude } : {}),
    ...(trimmedExclude ? { exclude: trimmedExclude } : {}),
    ...(hasMin ? { minPrice: Number(filters.minPrice) } : {}),
    ...(hasMax ? { maxPrice: Number(filters.maxPrice) } : {}),
  };
};

const parseJson = (value: string): unknown => {
  if (!value.trim()) {
    throw new Error("JSON is required.");
  }

  return JSON.parse(value);
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Network Error";
};

export default function ReceiptScannerApp() {
  const [receiptFilters, setReceiptFilters] = useState<ReceiptFilterState>(
    emptyReceiptFilters,
  );
  const [receiptJson, setReceiptJson] = useState(emptyReceiptJson);
  const [receiptUpdateJson, setReceiptUpdateJson] = useState(emptyReceiptJson);
  const [receiptUpdateId, setReceiptUpdateId] = useState("");
  const [receiptDeleteId, setReceiptDeleteId] = useState("");
  const [scanUserId, setScanUserId] = useState("");
  const [scanImageBase64, setScanImageBase64] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [receiptActionResult, setReceiptActionResult] = useState<string | null>(
    null,
  );

  const [userJson, setUserJson] = useState(emptyUserJson);
  const [userUpdateJson, setUserUpdateJson] = useState(emptyUserJson);
  const [userUpdateId, setUserUpdateId] = useState("");
  const [userDeleteId, setUserDeleteId] = useState("");
  const [userActionResult, setUserActionResult] = useState<string | null>(null);

  const [receiptsState, setReceiptsState] = useState<
    RequestState<Receipt[]>
  >({
    data: [],
    error: null,
    loading: false,
  });
  const [usersState, setUsersState] = useState<RequestState<User[]>>({
    data: [],
    error: null,
    loading: false,
  });

  const loadReceipts = useCallback(async () => {
    setReceiptsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const filters = buildFilters(receiptFilters);
      const data = await listReceipts(filters);
      setReceiptsState({ data, loading: false, error: null });
    } catch (error) {
      setReceiptsState({ data: [], loading: false, error: formatError(error) });
    }
  }, [receiptFilters]);

  const loadUsers = useCallback(async () => {
    setUsersState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await listUsers();
      setUsersState({ data, loading: false, error: null });
    } catch (error) {
      setUsersState({ data: [], loading: false, error: formatError(error) });
    }
  }, []);

  useEffect(() => {
    void loadReceipts();
    void loadUsers();
  }, [loadReceipts, loadUsers]);

  const receiptCountLabel = useMemo(() => {
    if (receiptsState.loading) {
      return "Loading receipts...";
    }

    if (receiptsState.data.length === 0) {
      return "No receipts found.";
    }

    return `${receiptsState.data.length} receipts found.`;
  }, [receiptsState.data.length, receiptsState.loading]);

  const userCountLabel = useMemo(() => {
    if (usersState.loading) {
      return "Loading users...";
    }

    if (usersState.data.length === 0) {
      return "No users found.";
    }

    return `${usersState.data.length} users found.`;
  }, [usersState.data.length, usersState.loading]);

  const handleCreateReceipt = async () => {
    try {
      const payload = parseJson(receiptJson);
      const response = await createReceipt(payload as never);
      setReceiptActionResult(JSON.stringify(response, null, 2));
      await loadReceipts();
    } catch (error) {
      setReceiptActionResult(formatError(error));
    }
  };

  const handleUpdateReceipt = async () => {
    try {
      if (!receiptUpdateId.trim()) {
        throw new Error("Receipt ID is required.");
      }

      const payload = parseJson(receiptUpdateJson);
      const response = await updateReceipt(receiptUpdateId.trim(), payload as never);
      setReceiptActionResult(JSON.stringify(response, null, 2));
      await loadReceipts();
    } catch (error) {
      setReceiptActionResult(formatError(error));
    }
  };

  const handleDeleteReceipt = async () => {
    try {
      if (!receiptDeleteId.trim()) {
        throw new Error("Receipt ID is required.");
      }

      await deleteReceipt(receiptDeleteId.trim());
      setReceiptActionResult("Receipt deleted.");
      await loadReceipts();
    } catch (error) {
      setReceiptActionResult(formatError(error));
    }
  };

  const handleScanReceipt = async () => {
    try {
      if (!scanUserId.trim()) {
        throw new Error("User ID is required.");
      }

      if (!scanImageBase64.trim()) {
        throw new Error("Base64 image is required.");
      }

      const response = await scanReceipt({
        userId: scanUserId.trim(),
        base64Image: scanImageBase64.trim(),
      });
      setScanResult(JSON.stringify(response, null, 2));
    } catch (error) {
      setScanResult(formatError(error));
    }
  };

  const handleCreateUser = async () => {
    try {
      const payload = parseJson(userJson);
      const response = await createUser(payload as never);
      setUserActionResult(JSON.stringify(response, null, 2));
      await loadUsers();
    } catch (error) {
      setUserActionResult(formatError(error));
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (!userUpdateId.trim()) {
        throw new Error("User ID is required.");
      }

      const payload = parseJson(userUpdateJson);
      const response = await updateUser(userUpdateId.trim(), payload as never);
      setUserActionResult(JSON.stringify(response, null, 2));
      await loadUsers();
    } catch (error) {
      setUserActionResult(formatError(error));
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (!userDeleteId.trim()) {
        throw new Error("User ID is required.");
      }

      await deleteUser(userDeleteId.trim());
      setUserActionResult("User deleted.");
      await loadUsers();
    } catch (error) {
      setUserActionResult(formatError(error));
    }
  };

  return (
    <div className="app container py-4">
      <header className="mb-4">
        <h1 className="mb-2">Receipt Scanner</h1>
        <p className="text-muted mb-0">
          Simple frontend for receipts and users API.
        </p>
      </header>

      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h4">Receipts</h2>
          <div className="text-muted small mb-3">
            Base URL: {API_BASE_URL}
          </div>

          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label">ID</label>
              <input
                className="form-control"
                value={receiptFilters.id}
                onChange={(event) =>
                  setReceiptFilters((prev) => ({
                    ...prev,
                    id: event.target.value,
                  }))
                }
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Include</label>
              <input
                className="form-control"
                value={receiptFilters.include}
                onChange={(event) =>
                  setReceiptFilters((prev) => ({
                    ...prev,
                    include: event.target.value,
                  }))
                }
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Exclude</label>
              <input
                className="form-control"
                value={receiptFilters.exclude}
                onChange={(event) =>
                  setReceiptFilters((prev) => ({
                    ...prev,
                    exclude: event.target.value,
                  }))
                }
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Min price</label>
              <input
                className="form-control"
                type="number"
                value={receiptFilters.minPrice}
                onChange={(event) =>
                  setReceiptFilters((prev) => ({
                    ...prev,
                    minPrice: event.target.value,
                  }))
                }
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Max price</label>
              <input
                className="form-control"
                type="number"
                value={receiptFilters.maxPrice}
                onChange={(event) =>
                  setReceiptFilters((prev) => ({
                    ...prev,
                    maxPrice: event.target.value,
                  }))
                }
              />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={loadReceipts}>
                Load receipts
              </button>
            </div>
          </div>

          {receiptsState.error && (
            <div className="alert alert-warning mt-3" role="alert">
              {receiptsState.error}
            </div>
          )}

          <div className="mt-3">
            <div className="text-muted small mb-2">{receiptCountLabel}</div>
            <div className="table-responsive">
              <table className="table table-striped table-bordered align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Store</th>
                    <th>Purchase Date</th>
                    <th>Total</th>
                    <th>Currency</th>
                    <th>Items</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptsState.data.length === 0 && !receiptsState.loading && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted">
                        No receipts found.
                      </td>
                    </tr>
                  )}
                  {receiptsState.data.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>{receipt.id}</td>
                      <td>{receipt.storeName}</td>
                      <td>{receipt.purchaseDateTime}</td>
                      <td>{receipt.total}</td>
                      <td>{receipt.currency}</td>
                      <td>{receipt.items.length}</td>
                      <td>
                        <details>
                          <summary className="text-primary">View</summary>
                          <pre className="mt-2 mb-0">
                            {JSON.stringify(receipt, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="row g-4 mt-1">
            <div className="col-lg-6">
              <h3 className="h6">Create receipt</h3>
              <textarea
                className="form-control font-monospace"
                rows={8}
                value={receiptJson}
                onChange={(event) => setReceiptJson(event.target.value)}
              />
              <button
                className="btn btn-success mt-2"
                onClick={handleCreateReceipt}
              >
                Create
              </button>
            </div>
            <div className="col-lg-6">
              <h3 className="h6">Update receipt</h3>
              <input
                className="form-control mb-2"
                placeholder="Receipt ID"
                value={receiptUpdateId}
                onChange={(event) => setReceiptUpdateId(event.target.value)}
              />
              <textarea
                className="form-control font-monospace"
                rows={7}
                value={receiptUpdateJson}
                onChange={(event) => setReceiptUpdateJson(event.target.value)}
              />
              <button
                className="btn btn-warning mt-2"
                onClick={handleUpdateReceipt}
              >
                Update
              </button>
            </div>
          </div>

          <div className="row g-4 mt-1">
            <div className="col-lg-6">
              <h3 className="h6">Delete receipt</h3>
              <input
                className="form-control"
                placeholder="Receipt ID"
                value={receiptDeleteId}
                onChange={(event) => setReceiptDeleteId(event.target.value)}
              />
              <button
                className="btn btn-outline-danger mt-2"
                onClick={handleDeleteReceipt}
              >
                Delete
              </button>
            </div>
            <div className="col-lg-6">
              <h3 className="h6">Scan receipt</h3>
              <input
                className="form-control mb-2"
                placeholder="User ID"
                value={scanUserId}
                onChange={(event) => setScanUserId(event.target.value)}
              />
              <textarea
                className="form-control font-monospace"
                rows={5}
                placeholder="Paste base64 receipt image data"
                value={scanImageBase64}
                onChange={(event) => setScanImageBase64(event.target.value)}
              />
              <button
                className="btn btn-info mt-2"
                onClick={handleScanReceipt}
              >
                Scan
              </button>
              {scanResult && (
                <pre className="bg-light border rounded p-2 mt-2 mb-0">
                  {scanResult}
                </pre>
              )}
            </div>
          </div>

          {receiptActionResult && (
            <div className="mt-3">
              <div className="text-muted small">Receipt action response</div>
              <pre className="bg-light border rounded p-2 mb-0">
                {receiptActionResult}
              </pre>
            </div>
          )}
        </div>
      </section>

      <section className="card shadow-sm">
        <div className="card-body">
          <h2 className="h4">Users</h2>
          <div className="text-muted small mb-3">
            Base URL: {API_BASE_URL}
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="text-muted small">{userCountLabel}</div>
            <button className="btn btn-outline-primary" onClick={loadUsers}>
              Refresh users
            </button>
          </div>

          {usersState.error && (
            <div className="alert alert-warning" role="alert">
              {usersState.error}
            </div>
          )}

          <div className="table-responsive mb-4">
            <table className="table table-striped table-bordered align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {usersState.data.length === 0 && !usersState.loading && (
                  <tr>
                    <td colSpan={2} className="text-center text-muted">
                      No users found.
                    </td>
                  </tr>
                )}
                {usersState.data.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>
                      <pre className="mb-0">
                        {JSON.stringify(user, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row g-4">
            <div className="col-lg-6">
              <h3 className="h6">Create user</h3>
              <textarea
                className="form-control font-monospace"
                rows={6}
                value={userJson}
                onChange={(event) => setUserJson(event.target.value)}
              />
              <button
                className="btn btn-success mt-2"
                onClick={handleCreateUser}
              >
                Create
              </button>
            </div>
            <div className="col-lg-6">
              <h3 className="h6">Update user</h3>
              <input
                className="form-control mb-2"
                placeholder="User ID"
                value={userUpdateId}
                onChange={(event) => setUserUpdateId(event.target.value)}
              />
              <textarea
                className="form-control font-monospace"
                rows={6}
                value={userUpdateJson}
                onChange={(event) => setUserUpdateJson(event.target.value)}
              />
              <button
                className="btn btn-warning mt-2"
                onClick={handleUpdateUser}
              >
                Update
              </button>
            </div>
          </div>

          <div className="row g-4 mt-1">
            <div className="col-lg-6">
              <h3 className="h6">Delete user</h3>
              <input
                className="form-control"
                placeholder="User ID"
                value={userDeleteId}
                onChange={(event) => setUserDeleteId(event.target.value)}
              />
              <button
                className="btn btn-outline-danger mt-2"
                onClick={handleDeleteUser}
              >
                Delete
              </button>
            </div>
          </div>

          {userActionResult && (
            <div className="mt-3">
              <div className="text-muted small">User action response</div>
              <pre className="bg-light border rounded p-2 mb-0">
                {userActionResult}
              </pre>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

