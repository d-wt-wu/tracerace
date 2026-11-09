// One complete, deliberately small owning list for checked teaching examples.
// Copying/moving List is disabled here; owning Node's Big Five is taught separately.
export const LIST_CPP = `class List {
  struct Node {
    int data; Node *next;
    Node(int d, Node *n): data{d}, next{n} {}
    ~Node() { delete next; }
  };
  Node *head = nullptr;
public:
  List() = default;
  List(const List &) = delete;
  List &operator=(const List &) = delete;
  class Iterator {
    Node *p;
  public:
    explicit Iterator(Node *n): p{n} {}
    int &operator*() { return p->data; }
    Iterator &operator++() { p = p->next; return *this; }
    bool operator!=(const Iterator &other) const { return p != other.p; }
  };
  Iterator begin() { return Iterator{head}; }
  Iterator end() { return Iterator{nullptr}; }
  void addToFront(int n) { head = new Node{n, head}; }
  int &ith(int i) {
    Node *p = head;
    for (int j = 0; j < i; ++j) p = p->next;
    return p->data;
  }
  ~List() { delete head; }
};`;

export const NODE_CPP = `struct Node {
  int data; Node *next;
  explicit Node(int d, Node *n = nullptr): data{d}, next{n} {}
  Node(const Node &o): data{o.data}, next{o.next ? new Node{*o.next} : nullptr} {}
  void swap(Node &o) { std::swap(data, o.data); std::swap(next, o.next); }
  Node &operator=(const Node &o) { Node tmp{o}; swap(tmp); return *this; }
  Node(Node &&o): data{o.data}, next{o.next} { o.next = nullptr; }
  Node &operator=(Node &&o) { swap(o); return *this; }
  ~Node() { delete next; }
};`;

export const COPY_NODE_CPP = `struct Node {
  int data; Node *next;
  explicit Node(int d, Node *n = nullptr): data{d}, next{n} {}
  Node(const Node &o): data{o.data}, next{o.next ? new Node{*o.next} : nullptr} {}
  ~Node() { delete next; }
};`;

export const ASSIGN_NODE_CPP = `struct Node {
  int data; Node *next;
  explicit Node(int d, Node *n = nullptr): data{d}, next{n} {}
  Node(const Node &o): data{o.data}, next{o.next ? new Node{*o.next} : nullptr} {}
  void swap(Node &o) { std::swap(data, o.data); std::swap(next, o.next); }
  Node &operator=(const Node &o) { Node tmp{o}; swap(tmp); return *this; }
  ~Node() { delete next; }
};`;
