import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from "@mui/material";
import { read, utils } from "xlsx";
import { DispatchRecord, DispatchState } from "./types";
import moment from "moment";

function App() {
  const [dispatchData, setDispatchData] = useState<DispatchState>({
    records: [],
    lastUpdated: new Date().toISOString(),
  });
  const [currentTime, setCurrentTime] = useState(moment());
  const [lastErrorStates, setLastErrorStates] = useState<Set<string>>(
    new Set()
  );
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = utils.sheet_to_json(worksheet);

      const records: DispatchRecord[] = jsonData.map((row: any) => ({
        time: row["時間"] || "",
        type: row["接送種類"] || "",
        id: row["編號"] || "",
        carNumber: row["服務車號"] || "",
        driverName: row["駕駛姓名"] || "",
        driverPhone: row["駕駛電話"] || "",
        carType: row["車款"] || "",
        flightNumber: row["航班編號"] || "",
        flightTime: row["航班時間"] || "",
        terminal: row["航站"] || "",
        address: row["接送地址"] || "",
        passengerName: row["貴賓姓名"] || "",
        passengerPhone: row["行動電話"] || "",
        customerType: row["客戶別"] || "",
        projectName: row["專案名稱"] || "",
        passengers: parseInt(row["搭乘人數"]) || 0,
        luggage: parseInt(row["行李件數"]) || 0,
        status: "pending" as const,
      }));

      const newState: DispatchState = {
        records,
        lastUpdated: new Date().toISOString(),
      };

      setDispatchData(newState);
      localStorage.setItem("dispatchData", JSON.stringify(newState));
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirm = (id: string) => {
    const updatedRecords = dispatchData.records.map((record) => {
      if (record.id === id) {
        return {
          ...record,
          status: "confirmed" as const,
          confirmedAt: new Date().toISOString(),
        };
      }
      return record;
    });

    const newState: DispatchState = {
      records: updatedRecords,
      lastUpdated: new Date().toISOString(),
    };

    setDispatchData(newState);
    localStorage.setItem("dispatchData", JSON.stringify(newState));
  };

  useEffect(() => {
    const savedData = localStorage.getItem("dispatchData");
    if (savedData) {
      setDispatchData(JSON.parse(savedData));
    }
  }, []);

  // 初始化音效
  useEffect(() => {
    audioRef.current = new Audio("/alert.mp3");
    audioRef.current.loop = true; // 設定為循環播放
  }, []);

  // 啟用音效
  const enableSound = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current!.currentTime = 0;
          setSoundEnabled(true);
        })
        .catch(console.error);
    }
  };

  // 每秒更新時間和重新計算狀態
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment());

      // 檢查是否有新的錯誤狀態
      const currentErrorStates = new Set<string>();
      dispatchData.records.forEach((record) => {
        const secondsDiff = moment(
          `${moment().format("YYYY-MM-DD")} ${record.time}`
        ).diff(moment(), "seconds", true);
        if (secondsDiff < 0 && record.status !== "confirmed") {
          currentErrorStates.add(record.id);
        }
      });

      // 如果有錯誤狀態且音效已啟用，播放警告音
      if (soundEnabled && currentErrorStates.size > 0) {
        audioRef.current?.play().catch(console.error);
      } else {
        audioRef.current?.pause();
        if (audioRef.current) {
          audioRef.current.currentTime = 0; // 重置音效時間
        }
      }

      setLastErrorStates(currentErrorStates);
    }, 1000);

    return () => clearInterval(timer);
  }, [dispatchData.records, lastErrorStates, soundEnabled]);

  const getStatusColor = (record: DispatchRecord) => {
    const now = moment();
    const today = moment().format("YYYY-MM-DD");
    const fullDispatchTime = moment(`${today} ${record.time}`);

    console.log({
      now: now.format("YYYY-MM-DD HH:mm"),
      dispatchTime: fullDispatchTime.format("YYYY-MM-DD HH:mm"),
      diff: fullDispatchTime.diff(now, "hours", true),
      driverName: record.driverName,
      record,
    });

    if (record.status === "confirmed") return "success.main";
    const secondsDiff = fullDispatchTime.diff(now, "seconds", true);

    // 如果時間已過且未確認，立即變紅
    if (secondsDiff < 0) return "error.main";

    // 如果接近時間（45分鐘內），顯示黃色
    if (secondsDiff <= 45 * 60) return "warning.main";

    // 其他情況顯示白色
    return "white";
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        派車確認系統
      </Typography>

      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", gap: 2 }}>
          <input
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            id="raised-button-file"
            type="file"
            onChange={handleFileUpload}
          />
          <label htmlFor="raised-button-file">
            <Button variant="contained" component="span">
              上傳派車資料
            </Button>
          </label>
          {!soundEnabled && (
            <Button
              variant="outlined"
              color="warning"
              onClick={enableSound}
              startIcon={<span>🔇</span>}
            >
              啟用警告音
            </Button>
          )}
        </Box>
        <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
          現在時間：{currentTime.format("YYYY-MM-DD HH:mm:ss")}
        </Typography>
      </Box>

      {dispatchData.records.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>時間</TableCell>
                <TableCell>類型</TableCell>
                <TableCell>車號</TableCell>
                <TableCell>駕駛</TableCell>
                <TableCell>電話</TableCell>
                <TableCell>航班</TableCell>
                <TableCell>地址</TableCell>
                <TableCell>乘客</TableCell>
                <TableCell>行李</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dispatchData.records.map((record) => (
                <TableRow
                  key={record.id}
                  sx={{
                    backgroundColor: getStatusColor(record),
                    "&:hover": { opacity: 0.8 },
                  }}
                >
                  <TableCell>{record.time}</TableCell>
                  <TableCell>{record.type}</TableCell>
                  <TableCell>{record.carNumber}</TableCell>
                  <TableCell>{record.driverName}</TableCell>
                  <TableCell>
                    <a
                      href={`tel:${record.driverPhone}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {record.driverPhone}
                    </a>
                  </TableCell>
                  <TableCell>{record.flightNumber}</TableCell>
                  <TableCell>{record.address}</TableCell>
                  <TableCell>{record.passengers}</TableCell>
                  <TableCell>{record.luggage}</TableCell>
                  <TableCell>
                    {record.status === "confirmed"
                      ? "已確認"
                      : record.status === "overdue"
                      ? "已超時"
                      : "待確認"}
                  </TableCell>
                  <TableCell>
                    {record.status === "pending" && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleConfirm(record.id)}
                      >
                        確認
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {dispatchData.records.length === 0 && (
        <Alert severity="info">請上傳派車資料檔案</Alert>
      )}
    </Container>
  );
}

export default App;
