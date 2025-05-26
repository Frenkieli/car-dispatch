export interface DispatchRecord {
  time: string;
  type: string;
  id: string;
  carNumber: string;
  driverName: string;
  driverPhone: string;
  carType: string;
  flightNumber: string;
  flightTime: string;
  terminal: string;
  address: string;
  passengerName: string;
  passengerPhone: string;
  customerType: string;
  projectName: string;
  passengers: number;
  luggage: number;
  status: "pending" | "confirmed" | "overdue";
  confirmedAt?: string;
}

export interface DispatchState {
  records: DispatchRecord[];
  lastUpdated: string;
}
