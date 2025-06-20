import { MouseEvent, useEffect, useRef, useState } from "react";

function ListComponent() {
  let items = ["Apple", "Orange", "Banana", "Melon"];
  /* let selectedIndex = -1; */
  // Hooks
  const [selectedIndex, setSelectedIndex] = useState(-1);
  /* [arr[0], arr[1]] */
  /* arr[0] : variable (selectedIndex), arr[1] : updater function  */
  const [name, setName] = useState("");

  // ref
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    console.log("Component rendered");
    const handleDocumentClick = (event: globalThis.MouseEvent) => {
      console.log("Handling Click");
      // If click target is outside the list, reset selection
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        console.log("Clicked outside, resetting selectedIndex");
        setSelectedIndex(-1);
      }
    };

    // Attach the listener when component mounts
    console.log("Added Listener");
    document.addEventListener("click", handleDocumentClick);

    console.log("Done setting Up List Hook");
    // Cleanup listener when component unmounts
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      console.log("Removing Listener");
    };
  }, []);

  /* items = []; */

  /*   if (items.length === 0)
    return (
      <>
        <h5>List</h5>
        <p>No item found</p>
      </>
    ); */

  /*   const message = items.length === 0 ? <p>No items found</p> : null; */

  const getMessage = (parameterExample: number) => {
    return items.length === 0 && <p>No item found</p>;
  };

  // Event Handler
  const printClickEvent = (event: React.MouseEvent) => console.log(event);

  // Print functions
  const printListItem = (item: string, index: number) =>
    console.log(item, index);

  return (
    <>
      <h5>List</h5>
      {/* { items.length === 0 ? <p>No item found</p> : null } */}
      {/* {items.length === 0 && <p>No item found</p>} */}
      {/* {message} */}
      {getMessage(1)}

      <ul className="list-group" ref={listRef}>
        {items.map((fruit, index) => (
          <li
            className={
              selectedIndex === index
                ? "list-group-item active"
                : "list-group-item"
            }
            key={fruit}
            onClick={(event) => {
              event.stopPropagation();
              printListItem(fruit, index);
              printClickEvent(event);
              if (selectedIndex === index) {
                setSelectedIndex(-1); // Deselect if already selected
              } else {
                setSelectedIndex(index); // Select if not selected
              }
            }}
          >
            {fruit}
          </li>
        ))}
      </ul>
    </>
  );
}

export default ListComponent;
