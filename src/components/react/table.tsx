import React, { useState, useMemo } from "react"
import { Search } from "lucide-react"

export interface Item {
  name: string
  price: string
  mrp: string
  status: string
  tags: string[]
}

interface DataItems {
  data: Item[]
}

export const NormalTable: React.FC<DataItems> = ({ data }) => {
  return (
    <table className="w-full table-auto border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-300 px-4 py-2">Name</th>
          <th className="border border-gray-300 px-4 py-2">Age</th>
          <th className="border border-gray-300 px-4 py-2">City</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="border border-gray-300 px-4 py-2">{item.name}</td>
            <td className="border border-gray-300 px-4 py-2">{item.price}</td>
            <td className="border border-gray-300 px-4 py-2">{item.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const StyledTable: React.FC<DataItems> = ({ data }) => {
  return (
    <div className="mx-auto mt-5 max-w-4xl">
      <table className="w-full table-auto border-collapse overflow-hidden rounded-xl shadow-lg">
        <thead>
          <tr className="bg-orange-100 text-left text-gray-700">
            <th className="px-6 py-3">Name</th>
            <th className="px-6 py-3">Price</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Tags</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {data.map((item, idx) => (
            <tr
              key={idx}
              className={`hover:bg-gray-50 ${
                item.price === "Free" ? "bg-yellow-100" : ""
              }`}
            >
              <td className="px-6 py-4">{item.name}</td>
              <td className="px-6 py-4">
                {item.price}{" "}
                <i>
                  <del>{item.mrp}</del>
                </i>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    item.status === "Available"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="mr-2 rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SearchableTable: React.FC<DataItems> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("")

  // rerender only when searchTerm or data changes else memoize data
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return []

    return data.filter((row) =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, data])

  return (
    <div className="mx-auto p-2">
      <div className="mb-4 flex items-center rounded border border-gray-300 px-2">
        <Search className="mr-2 h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search... by name/status/tag/price"
          className="w-full p-2 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <StyledTable data={filteredData} />
    </div>
  )
}

export default SearchableTable
