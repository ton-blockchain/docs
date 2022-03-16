# Cell
Everything in TON is stored in cells.
Cell is a data sctructure which contains up to 1023 bits (! not bytes) of data and up to 4 references to other cells. Bits and references are not intermixed (stored separately). Circular references are forbidden: for any cell none of it's descendant cell can has this cell as reference. In this way, all cells constitute a directed acyclic graph (DAG).

## Cell types
Currently there are 5 types of cells: _ordinary_ and 4 _exotic_.
Exotic types include the following:
* Pruned branch cell
* Library reference cell
* Merkle proof cell
* Merkle update cell

More info on exotic cells can be found in [TVM Whitepaper, section 3](https://ton.org/tvm.pdf).

## Cell flavors
Cell by itself is an opaque object which is optimized for compact storage. In particular it deduplicates data: if there are a few eqivalent sub-cells referenced in different branches, the content of such cells is stored only once. 
However, opaqueness means that cell can not be modified or read. Thus there are 2 additional flavors of the cells:
* _Builder_ -  represents partially constructed cells, for which fast operations for appending bitstrings, integers, other cells, and references to other cells can be defined.
* _Slice_ - represents 'dissected' cell, which represent either the remainder of a partially parsed cell, or a value (subcell) residing inside such a cell and extracted from it by a parsing instruction.

There is also special flavor used in TVM:

* _Continuation_ - represent cell which contain op-codes (instructions) for Ton Virtual Machine see [TVM Bird's-eye overview](/smart-contracts/tvm_overview.md).

## Serialization of data to cells
Any object in TON: message, message queue, block, whole blockchain state, contract code and data serializes to cell. The way of serialization is described by TL-B scheme: formal description of how this object can be serialized to Builder or how to parse object of given type from the Slice.
TL-B for cells is the same as TL or ProtoBuf for byte-streams.
More info about TL-B can be found [here](/overviews/TL-B.md)
