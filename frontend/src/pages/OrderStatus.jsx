import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import './OrderStatus.css';

const OrderStatus = () => {
  const { currentOrder } = useAppContext();

  if (!currentOrder || (!currentOrder.donHang && !currentOrder.message)) {
    return <Navigate to="/" />;
  }

  const { donHang, thanhToan, lichSuKho, message, hoanTien } = currentOrder;

  const isSuccess = donHang?.trangThai === 'THANH_CONG';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'THANH_CONG':
      case 'DA_TRU_TIEN':
      case 'TRU_KHO_THANH_CONG':
      case 'DA_XAC_NHAN':
        return <span className="badge badge-success">{status}</span>;
      case 'THAT_BAI':
      case 'ROLLBACK':
      case 'DA_HOAN_TIEN':
      case 'THAT_BAI_DO_SO_DU':
      case 'KHONG_TUONG_TAC_KHO':
      case 'TU_CHOI_THANH_TOAN':
      case 'KHONG_XU_LY':
        return <span className="badge badge-error">{status}</span>;
      case 'GIU_CHO':
        return <span className="badge badge-warning">{status}</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const getStatusIcon = (status) => {
      if (['THANH_CONG', 'DA_TRU_TIEN', 'TRU_KHO_THANH_CONG', 'DA_XAC_NHAN'].includes(status)) {
          return <CheckCircle2 className="icon-success" size={24} />;
      }
      if (['THAT_BAI', 'THAT_BAI_DO_SO_DU', 'TU_CHOI_THANH_TOAN'].includes(status)) {
          return <XCircle className="icon-error" size={24} />;
      }
      if (['ROLLBACK', 'DA_HOAN_TIEN'].includes(status)) {
          return <AlertCircle className="icon-compensation" size={24} />;
      }
      if (['GIU_CHO'].includes(status)) {
          return <Clock className="icon-warning" size={24} />;
      }
      return <Clock size={24} />;
  }

  // hoanTien can be present instead of thanhToan on failure
  const paymentLogs = thanhToan || hoanTien || [];
  const inventoryLogs = lichSuKho || [];

  return (
    <div className="status-container pb-8">
      <div className="status-header card mb-4 text-center">
        {isSuccess ? 
          <CheckCircle2 className="mx-auto block icon-success mb-2" size={48} /> : 
          <XCircle className="mx-auto block icon-error mb-2" size={48} />}
        <h2>{message}</h2>
        <div className="order-meta mt-4 flex flex-col items-center">
          <p className="mb-2"><strong>Khách Hàng:</strong> {donHang?.nguoiMua}</p>
          <div className="flex items-center gap-2">
            <strong>Trạng thái Đơn Hàng:</strong> {getStatusBadge(donHang?.trangThai)}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="saga-visualizer card">
            <h3 className="section-title">Lịch Sử Thanh Toán / Thất Bại</h3>
            <div className="log-list mt-4">
               {paymentLogs.length > 0 ? paymentLogs.map((log, i) => (
                   <div key={i} className="log-item flex justify-between items-center bg-gray-50 p-4 mb-2 rounded border">
                       <div>
                           <div className="text-sm text-gray-500">Mã Đơn:</div>
                           <div className="font-medium">{log.maDon}</div>
                       </div>
                       <div className="flex items-center gap-2">
                           {getStatusIcon(log.trangThai)}
                           {getStatusBadge(log.trangThai)}
                       </div>
                   </div>
               )) : <p>Không có dữ liệu</p>}
            </div>
        </div>

        <div className="saga-visualizer card">
            <h3 className="section-title">Lịch Sử Kho Hàng</h3>
            <div className="log-list mt-4">
               {inventoryLogs.length > 0 ? inventoryLogs.map((log, i) => (
                   <div key={i} className="log-item flex justify-between items-center bg-gray-50 p-4 mb-2 rounded border">
                       <div>
                           <div className="text-sm text-gray-500">Mã Đơn:</div>
                           <div className="font-medium">{log.maDon}</div>
                       </div>
                       <div className="flex items-center gap-2">
                           {getStatusIcon(log.trangThai)}
                           {getStatusBadge(log.trangThai)}
                       </div>
                   </div>
               )) : <p>Không có dữ liệu</p>}
            </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <Link to="/" className="btn-primary">Quay Về Trang Chủ</Link>
      </div>
    </div>
  );
};

export default OrderStatus;
