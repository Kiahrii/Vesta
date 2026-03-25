import { useMemo, useState } from 'react';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import Row from 'react-bootstrap/Row';

// project-imports
import MainCard from 'components/MainCard';
import 'assets/scss/apartment-page/profile.scss';
import { useLandlordPaymentAccounts } from 'viewmodel/landlordPaymentAccounts.js';

// assets
import LogoDark from 'assets/images/logo-dark.svg';

// ==============================|| PROFILE PAGE ||============================== //

const initialProfile = {
  name: 'Kezea Garcia',
  role: 'Landlord',
  email: 'vestahub@gmail.com',
  company: 'Vesta Properties Inc.'
};

export default function ProfilePage() {
  const [profile] = useState(initialProfile);
  const { accounts, loading, error, addAccount, updateAccount } = useLandlordPaymentAccounts();
  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEditId, setSavingEditId] = useState(null);
  const [formValues, setFormValues] = useState({
    account_type: 'E-Wallet',
    provider_name: '',
    account_name: '',
    account_number: ''
  });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const groupedAccounts = useMemo(() => {
    return accounts.reduce((acc, account) => {
      const key = account.account_type;
      acc[key] = acc[key] || [];
      acc[key].push(account);
      return acc;
    }, {});
  }, [accounts]);

  const handleCopy = async (value, id) => {
    if (!value) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch (error) {
      console.error('Failed to copy account number', error);
    }
  };

  const startEdit = (account) => {
    setEditingId(account.account_id);
    setEditValue(account.account_number);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (accountId) => {
    const nextValue = editValue.trim();
    if (!nextValue) return;
    setEditError('');
    setSavingEditId(accountId);

    try {
      await updateAccount(accountId, { account_number: nextValue });
      setEditingId(null);
      setEditValue('');
    } catch (updateError) {
      setEditError(updateError.message || 'Unable to update payment account.');
    } finally {
      setSavingEditId(null);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddAccount = async (event) => {
    event.preventDefault();
    const trimmedValues = {
      account_type: formValues.account_type,
      provider_name: formValues.provider_name.trim(),
      account_name: formValues.account_name.trim(),
      account_number: formValues.account_number.trim()
    };

    if (!trimmedValues.provider_name || !trimmedValues.account_name || !trimmedValues.account_number) {
      return;
    }

    setFormError('');
    setFormSaving(true);

    try {
      await addAccount(trimmedValues);
    } catch (addError) {
      setFormError(addError.message || 'Unable to save payment details.');
      setFormSaving(false);
      return;
    }

    setFormValues({
      account_type: formValues.account_type,
      provider_name: '',
      account_name: '',
      account_number: ''
    });
    setFormSaving(false);
  };

  return (
    <Row className="profile-page">
      <Col xs={12}>
        <div className="profile-page__header">
          <h3 className="profile-page__title">My Profile</h3>
          <p className="profile-page__subtitle">Manage your personal information and payment details.</p>
        </div>
      </Col>

      <Col xs={12}>
        <MainCard className="profile-hero-card" bodyClassName="profile-hero-body" content>
          <div className="profile-hero__avatar">
            <Image src={LogoDark} alt="Vesta logo" className="profile-hero__avatar-img" />
          </div>
          <div className="profile-hero__details">
            <h4>{profile.name}</h4>
            <p className="profile-hero__role">{profile.role}</p>
            <p className="profile-hero__email">{profile.email}</p>
          </div>
          <div className="profile-hero__tag">
            <span className="profile-hero__tag-label">Landlord</span>
            <span className="profile-hero__tag-value">Vesta Hub</span>
          </div>
        </MainCard>
      </Col>

      <Col xs={12}>
        <MainCard title="Payment Details" className="payment-details-card">
          <div className="payment-details-grid">
            <div className="payment-panel">
              <div className="payment-panel__header">
                <div>
                  <h6>E-Wallet</h6>
                  <span>{profile.name}</span>
                </div>
                <i className="ph ph-wallet" />
              </div>
              <div className="payment-panel__body">
                {loading ? <p className="payment-empty">Loading payment details...</p> : null}
                {!loading &&
                  (groupedAccounts['E-Wallet'] || []).map((account) => (
                  <div className="payment-row" key={account.account_id}>
                    <div className="payment-row__info">
                      <span className="payment-row__provider">{account.provider_name}</span>
                      <span className="payment-row__name">{account.account_name}</span>
                    </div>
                    <div className="payment-row__number">
                      {editingId === account.account_id ? (
                        <div className="payment-edit">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(event) => setEditValue(event.target.value)}
                            className="payment-edit__input"
                          />
                          <div className="payment-edit__actions">
                            <button
                              type="button"
                              className="payment-edit__save"
                              onClick={() => saveEdit(account.account_id)}
                              disabled={savingEditId === account.account_id}
                            >
                              {savingEditId === account.account_id ? 'Saving...' : 'Save'}
                            </button>
                            <button type="button" className="payment-edit__cancel" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="payment-row__actions">
                          <button type="button" onClick={() => handleCopy(account.account_number, account.account_id)}>
                            {account.account_number}
                          </button>
                          <button type="button" className="payment-row__edit" onClick={() => startEdit(account)}>
                            Edit
                          </button>
                          <span className={`copy-status ${copiedId === account.account_id ? 'is-visible' : ''}`}>
                            Copied
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && (groupedAccounts['E-Wallet'] || []).length === 0 ? (
                  <p className="payment-empty">No e-wallet accounts yet.</p>
                ) : null}
              </div>
            </div>

            <div className="payment-panel">
              <div className="payment-panel__header">
                <div>
                  <h6>Bank Transfer</h6>
                  <span>{profile.company}</span>
                </div>
                <i className="ph ph-bank" />
              </div>
              <div className="payment-panel__body">
                {loading ? <p className="payment-empty">Loading payment details...</p> : null}
                {!loading &&
                  (groupedAccounts['Bank Transfer'] || []).map((account) => (
                  <div className="payment-row" key={account.account_id}>
                    <div className="payment-row__info">
                      <span className="payment-row__provider">{account.provider_name}</span>
                      <span className="payment-row__name">{account.account_name}</span>
                    </div>
                    <div className="payment-row__number">
                      {editingId === account.account_id ? (
                        <div className="payment-edit">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(event) => setEditValue(event.target.value)}
                            className="payment-edit__input"
                          />
                          <div className="payment-edit__actions">
                            <button
                              type="button"
                              className="payment-edit__save"
                              onClick={() => saveEdit(account.account_id)}
                              disabled={savingEditId === account.account_id}
                            >
                              {savingEditId === account.account_id ? 'Saving...' : 'Save'}
                            </button>
                            <button type="button" className="payment-edit__cancel" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="payment-row__actions">
                          <button type="button" onClick={() => handleCopy(account.account_number, account.account_id)}>
                            {account.account_number}
                          </button>
                          <button type="button" className="payment-row__edit" onClick={() => startEdit(account)}>
                            Edit
                          </button>
                          <span className={`copy-status ${copiedId === account.account_id ? 'is-visible' : ''}`}>
                            Copied
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && (groupedAccounts['Bank Transfer'] || []).length === 0 ? (
                  <p className="payment-empty">No bank accounts yet.</p>
                ) : null}
              </div>
            </div>
          </div>
          {error ? <p className="payment-error">{error}</p> : null}
          {editError ? <p className="payment-error">{editError}</p> : null}
        </MainCard>
      </Col>

      <Col xs={12}>
        <MainCard title="Add Payment Details" className="payment-add-card">
          <Form onSubmit={handleAddAccount} className="payment-form">
            <Row>
              <Col md={4}>
                <Form.Group controlId="accountType">
                  <Form.Label>Account Type</Form.Label>
                  <Form.Select name="account_type" value={formValues.account_type} onChange={handleFormChange}>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="providerName">
                  <Form.Label>Provider Name</Form.Label>
                  <Form.Control
                    name="provider_name"
                    value={formValues.provider_name}
                    onChange={handleFormChange}
                    placeholder="GCash, Maya, BDO"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="accountName">
                  <Form.Label>Account Name</Form.Label>
                  <Form.Control
                    name="account_name"
                    value={formValues.account_name}
                    onChange={handleFormChange}
                    placeholder="Account holder name"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mt-3 align-items-end">
              <Col md={8}>
                <Form.Group controlId="accountNumber">
                  <Form.Label>Account Number</Form.Label>
                  <Form.Control
                    name="account_number"
                    value={formValues.account_number}
                    onChange={handleFormChange}
                    placeholder="Enter account number"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="text-md-end mt-3 mt-md-0">
                <Button type="submit" className="payment-form__submit w-100" disabled={formSaving}>
                  {formSaving ? 'Saving...' : 'Add Payment Details'}
                </Button>
              </Col>
            </Row>
          </Form>
          {formError ? <p className="payment-error mt-3">{formError}</p> : null}
        </MainCard>
      </Col>
    </Row>
  );
}
