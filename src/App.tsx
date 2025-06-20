import Message from "./components/NavBar";
import ListComponent from "./components/ListComponent";
import QRScanner from "./components/QR";

function App() {
  return (
    <>
      {/* <div>
        <Message />
      </div>
      <div>
        <ListComponent />
        <ListComponent />
        <ListComponent />
      </div> */}
      <QRScanner />
    </>
  );
}

export default App;
